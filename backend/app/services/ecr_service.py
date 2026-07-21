from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ecr import ECR, ECRStatus
from app.models.user import User, UserRole
from app.schemas.ecr import ECRCreate, ECRUpdate
from app.services import ai_service, audit_service, numbering_service

# Legal status transitions. Anything not listed here is rejected, which
# keeps the ECR lifecycle enforceable at the service layer rather than
# trusting every caller to check business rules themselves.
VALID_TRANSITIONS: dict[ECRStatus, set[ECRStatus]] = {
    ECRStatus.DRAFT: {ECRStatus.SUBMITTED, ECRStatus.CANCELLED},
    ECRStatus.SUBMITTED: {ECRStatus.UNDER_REVIEW, ECRStatus.CANCELLED},
    ECRStatus.UNDER_REVIEW: {ECRStatus.APPROVED, ECRStatus.REJECTED, ECRStatus.CANCELLED},
    ECRStatus.APPROVED: {ECRStatus.CONVERTED, ECRStatus.CANCELLED},
    ECRStatus.REJECTED: set(),
    ECRStatus.CONVERTED: set(),
    ECRStatus.CANCELLED: set(),
}


async def create_ecr(db: AsyncSession, data: ECRCreate, actor: User) -> ECR:
    ecr_number = await numbering_service.generate_ecr_number(db)
    ecr = ECR(
        ecr_number=ecr_number,
        title=data.title,
        description=data.description,
        reason_code=data.reason_code,
        priority=data.priority,
        affected_part_id=data.affected_part_id,
        justification=data.justification,
        proposed_solution=data.proposed_solution,
        estimated_cost_impact=data.estimated_cost_impact,
        requested_by_id=actor.id,
        status=ECRStatus.DRAFT,
    )
    db.add(ecr)
    await db.flush()

    # AI summary generation is best-effort and never blocks creation.
    summary = await ai_service.summarize_change(
        title=data.title, description=data.description,
        reason=data.reason_code.value, justification=data.justification,
    )
    if summary:
        ecr.ai_summary = summary

    await audit_service.record(
        db, actor=actor, action="ecr.created", entity_type="ECR", entity_id=ecr.id,
        after_state={"ecr_number": ecr_number, "title": data.title},
    )
    await db.commit()
    return await get_ecr(db, ecr.id)


async def get_ecr(db: AsyncSession, ecr_id: int) -> ECR | None:
    result = await db.execute(select(ECR).options(selectinload(ECR.requested_by)).where(ECR.id == ecr_id))
    return result.scalar_one_or_none()


async def list_ecrs(
    db: AsyncSession, *, status_filter: ECRStatus | None = None, search: str | None = None,
    page: int = 1, page_size: int = 25,
) -> tuple[list[ECR], int]:
    query = select(ECR).options(selectinload(ECR.requested_by))
    if status_filter:
        query = query.where(ECR.status == status_filter)
    if search:
        like = f"%{search}%"
        query = query.where((ECR.title.ilike(like)) | (ECR.ecr_number.ilike(like)))

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.order_by(ECR.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_ecr(db: AsyncSession, ecr: ECR, data: ECRUpdate, actor: User) -> ECR:
    if ecr.status != ECRStatus.DRAFT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only draft ECRs can be edited.")
    if ecr.requested_by_id != actor.id and actor.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the original requester or an admin can edit this ECR.")
    before = {"title": ecr.title, "description": ecr.description}
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(ecr, key, value)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="ecr.updated", entity_type="ECR", entity_id=ecr.id,
        before_state=before, after_state=updates,
    )
    await db.commit()
    return await get_ecr(db, ecr.id)


async def change_status(db: AsyncSession, ecr: ECR, new_status: ECRStatus, comments: str | None, actor: User) -> ECR:
    allowed = VALID_TRANSITIONS.get(ecr.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot move ECR from '{ecr.status.value}' to '{new_status.value}'.",
        )
    before_status = ecr.status.value
    ecr.status = new_status
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="ecr.status_changed", entity_type="ECR", entity_id=ecr.id,
        before_state={"status": before_status}, after_state={"status": new_status.value, "comments": comments},
    )
    await db.commit()
    return await get_ecr(db, ecr.id)
