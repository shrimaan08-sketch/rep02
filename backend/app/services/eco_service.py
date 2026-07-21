import logging

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.approval import ApprovalStep
from app.models.ecr import ECR, ECRStatus
from app.models.eco import ECO, ECOAffectedPart, ECOStatus
from app.models.part import Part, PartStatus
from app.models.user import User, UserRole
from app.schemas.eco import ECOCreate, ECOUpdate
from app.services import ai_service, approval_service, audit_service, barcode_service, numbering_service

logger = logging.getLogger("eco_platform.eco_service")

VALID_TRANSITIONS: dict[ECOStatus, set[ECOStatus]] = {
    ECOStatus.DRAFT: {ECOStatus.PENDING_APPROVAL, ECOStatus.CANCELLED},
    ECOStatus.PENDING_APPROVAL: {ECOStatus.IN_REVIEW, ECOStatus.CANCELLED},
    ECOStatus.IN_REVIEW: {ECOStatus.APPROVED, ECOStatus.REJECTED, ECOStatus.CANCELLED},
    ECOStatus.APPROVED: {ECOStatus.IMPLEMENTED, ECOStatus.CANCELLED},
    ECOStatus.IMPLEMENTED: {ECOStatus.CLOSED},
    ECOStatus.REJECTED: {ECOStatus.DRAFT},  # can be revised and resubmitted
    ECOStatus.CLOSED: set(),
    ECOStatus.CANCELLED: set(),
}


async def create_eco(db: AsyncSession, data: ECOCreate, actor: User) -> ECO:
    eco_number = await numbering_service.generate_eco_number(db)
    eco = ECO(
        eco_number=eco_number,
        title=data.title,
        description=data.description,
        eco_class=data.eco_class,
        source_ecr_id=data.source_ecr_id,
        disposition_notes=data.disposition_notes,
        effectivity_date=data.effectivity_date,
        estimated_cost_impact=data.estimated_cost_impact,
        initiated_by_id=actor.id,
        status=ECOStatus.DRAFT,
    )
    db.add(eco)
    await db.flush()

    affected_part_numbers: list[str] = []
    for affected in data.affected_parts:
        db.add(
            ECOAffectedPart(
                eco_id=eco.id,
                part_id=affected.part_id,
                from_revision_id=affected.from_revision_id,
                to_revision_id=affected.to_revision_id,
                change_description=affected.change_description,
            )
        )
        part = await db.get(Part, affected.part_id)
        if part:
            part.status = PartStatus.PENDING_CHANGE
            affected_part_numbers.append(part.part_number)
    await db.flush()

    if data.source_ecr_id:
        ecr = await db.get(ECR, data.source_ecr_id)
        if ecr and ecr.status == ECRStatus.APPROVED:
            ecr.status = ECRStatus.CONVERTED

    summary = await ai_service.summarize_change(
        title=data.title, description=data.description, affected_parts=affected_part_numbers,
    )
    if summary:
        eco.ai_summary = summary

    # Generate scannable identifiers for shop-floor / traveler use.
    try:
        qr_path = barcode_service.generate_qr_code(f"ECO:{eco.eco_number}", eco.eco_number)
        barcode_path = barcode_service.generate_barcode(eco.eco_number, eco.eco_number)
        eco.qr_code_path = qr_path
        eco.barcode_path = barcode_path
    except Exception:
        logger.exception("QR/barcode generation failed for %s; continuing without them.", eco.eco_number)

    await audit_service.record(
        db, actor=actor, action="eco.created", entity_type="ECO", entity_id=eco.id,
        after_state={"eco_number": eco_number, "title": data.title, "eco_class": data.eco_class.value},
    )
    await db.commit()
    return await get_eco(db, eco.id)


async def get_eco(db: AsyncSession, eco_id: int) -> ECO | None:
    result = await db.execute(
        select(ECO)
        .options(
            selectinload(ECO.affected_parts),
            selectinload(ECO.approval_chain).selectinload(ApprovalStep.approver),
            selectinload(ECO.initiated_by),
        )
        .where(ECO.id == eco_id)
    )
    return result.scalar_one_or_none()


async def list_ecos(
    db: AsyncSession, *, status_filter: ECOStatus | None = None, search: str | None = None,
    page: int = 1, page_size: int = 25,
) -> tuple[list[ECO], int]:
    query = select(ECO).options(selectinload(ECO.initiated_by))
    if status_filter:
        query = query.where(ECO.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.where((ECO.title.ilike(like)) | (ECO.eco_number.ilike(like)))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(ECO.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_eco(db: AsyncSession, eco: ECO, data: ECOUpdate, actor: User) -> ECO:
    if eco.status not in (ECOStatus.DRAFT, ECOStatus.REJECTED):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only draft or rejected ECOs can be edited.")
    if eco.initiated_by_id != actor.id and actor.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the ECO initiator or an admin can edit this ECO.")
    before = {"title": eco.title, "description": eco.description}
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(eco, key, value)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="eco.updated", entity_type="ECO", entity_id=eco.id,
        before_state=before, after_state=updates,
    )
    await db.commit()
    return await get_eco(db, eco.id)


async def submit_for_approval(db: AsyncSession, eco: ECO, actor: User) -> ECO:
    allowed = VALID_TRANSITIONS.get(eco.status, set())
    if ECOStatus.PENDING_APPROVAL not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot submit ECO from status '{eco.status.value}'.")

    before_status = eco.status.value
    eco.status = ECOStatus.IN_REVIEW
    await approval_service.build_approval_chain(db, eco)

    await audit_service.record(
        db, actor=actor, action="eco.submitted_for_approval", entity_type="ECO", entity_id=eco.id,
        before_state={"status": before_status}, after_state={"status": eco.status.value},
    )
    await db.commit()
    # `eco` was loaded before its approval chain existed, so its
    # `approval_chain` collection is cached as empty in this session's identity
    # map (expire_on_commit is False). Detach it so the reload below builds a
    # fresh, fully-loaded instance with the freshly-built chain rather than
    # returning the stale empty collection. (expunge is async-safe here;
    # db.expire would trigger a sync lazy-load and raise MissingGreenlet.)
    db.expunge(eco)
    return await get_eco(db, eco.id)


async def mark_implemented(db: AsyncSession, eco: ECO, actor: User) -> ECO:
    if eco.status != ECOStatus.APPROVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only approved ECOs can be marked implemented.")
    eco.status = ECOStatus.IMPLEMENTED

    result = await db.execute(select(ECOAffectedPart).where(ECOAffectedPart.eco_id == eco.id))
    for affected in result.scalars().all():
        part = await db.get(Part, affected.part_id)
        if part:
            part.status = PartStatus.ACTIVE
            if affected.to_revision_id:
                part.current_revision_id = affected.to_revision_id

    await audit_service.record(
        db, actor=actor, action="eco.implemented", entity_type="ECO", entity_id=eco.id,
        after_state={"status": eco.status.value},
    )
    await db.commit()
    return await get_eco(db, eco.id)


async def close_eco(db: AsyncSession, eco: ECO, actor: User) -> ECO:
    if eco.status != ECOStatus.IMPLEMENTED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only implemented ECOs can be closed.")
    eco.status = ECOStatus.CLOSED
    await audit_service.record(
        db, actor=actor, action="eco.closed", entity_type="ECO", entity_id=eco.id,
        after_state={"status": eco.status.value},
    )
    await db.commit()
    return await get_eco(db, eco.id)


async def cancel_eco(db: AsyncSession, eco: ECO, reason: str | None, actor: User) -> ECO:
    allowed = VALID_TRANSITIONS.get(eco.status, set())
    if ECOStatus.CANCELLED not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot cancel ECO from status '{eco.status.value}'.")
    eco.status = ECOStatus.CANCELLED
    await audit_service.record(
        db, actor=actor, action="eco.cancelled", entity_type="ECO", entity_id=eco.id,
        after_state={"status": eco.status.value, "reason": reason},
    )
    await db.commit()
    return await get_eco(db, eco.id)
