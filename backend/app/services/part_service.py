from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.part import Part, PartRevision, PartStatus
from app.models.user import User
from app.schemas.part import PartCreate, PartUpdate
from app.services import audit_service


async def create_part(db: AsyncSession, data: PartCreate, actor: User) -> Part:
    existing = await db.execute(select(Part).where(Part.part_number == data.part_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Part number {data.part_number} already exists.")

    part = Part(
        part_number=data.part_number,
        name=data.name,
        description=data.description,
        part_type=data.part_type,
        unit_of_measure=data.unit_of_measure,
        standard_cost=data.standard_cost,
        status=PartStatus.IN_DESIGN,
    )
    db.add(part)
    await db.flush()

    initial_revision = PartRevision(
        part_id=part.id,
        revision_code="A",
        is_released=False,
        specification=data.initial_specification,
        change_summary="Initial part creation.",
    )
    db.add(initial_revision)
    await db.flush()

    part.current_revision_id = initial_revision.id
    await db.flush()

    await audit_service.record(
        db, actor=actor, action="part.created", entity_type="Part", entity_id=part.id,
        after_state={"part_number": part.part_number, "name": part.name},
    )
    await db.commit()
    await db.refresh(part)
    return part


async def get_part(db: AsyncSession, part_id: int, with_revisions: bool = False) -> Part | None:
    query = select(Part).where(Part.id == part_id)
    if with_revisions:
        query = query.options(selectinload(Part.revisions))
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_part_by_number(db: AsyncSession, part_number: str) -> Part | None:
    result = await db.execute(select(Part).where(Part.part_number == part_number))
    return result.scalar_one_or_none()


async def list_parts(
    db: AsyncSession, *, search: str | None = None, status_filter: PartStatus | None = None,
    page: int = 1, page_size: int = 25,
) -> tuple[list[Part], int]:
    query = select(Part)
    if search:
        like = f"%{search}%"
        query = query.where((Part.part_number.ilike(like)) | (Part.name.ilike(like)))
    if status_filter:
        query = query.where(Part.status == status_filter)

    # Count via SQL COUNT rather than materializing every row — keeps list
    # endpoints fast even as the catalog grows to tens of thousands of parts.
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()

    query = query.order_by(Part.part_number).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_part(db: AsyncSession, part: Part, data: PartUpdate, actor: User) -> Part:
    before = {"name": part.name, "status": part.status.value, "description": part.description}
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(part, key, value)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="part.updated", entity_type="Part", entity_id=part.id,
        before_state=before, after_state=updates,
    )
    await db.commit()
    await db.refresh(part)
    return part


async def create_revision(
    db: AsyncSession, part: Part, *, revision_code: str, change_summary: str,
    specification: str | None, eco_id: int | None, actor: User,
) -> PartRevision:
    existing = await db.execute(
        select(PartRevision).where(PartRevision.part_id == part.id, PartRevision.revision_code == revision_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, f"Revision {revision_code} already exists for this part.")

    revision = PartRevision(
        part_id=part.id,
        revision_code=revision_code,
        change_summary=change_summary,
        specification=specification,
        eco_id=eco_id,
        is_released=False,
    )
    db.add(revision)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="part.revision_created", entity_type="PartRevision", entity_id=revision.id,
        after_state={"part_id": part.id, "revision_code": revision_code, "eco_id": eco_id},
    )
    await db.commit()
    await db.refresh(revision)
    return revision


async def release_revision(db: AsyncSession, revision: PartRevision, actor: User) -> PartRevision:
    """Marks a revision released and promotes it to the part's current
    revision — this is the moment a new part definition becomes the
    official, production-effective one."""
    revision.is_released = True
    part_result = await db.execute(select(Part).where(Part.id == revision.part_id))
    part = part_result.scalar_one()
    before = {"current_revision_id": part.current_revision_id}
    part.current_revision_id = revision.id
    part.status = PartStatus.ACTIVE
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="part.revision_released", entity_type="Part", entity_id=part.id,
        before_state=before, after_state={"current_revision_id": revision.id},
    )
    await db.commit()
    await db.refresh(revision)
    return revision
