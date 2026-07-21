"""
Approval workflow engine.

Design: each ECOClass maps to an ordered template of required roles. When an
ECO is submitted, we materialize that template into concrete ApprovalStep
rows. Steps execute in ascending `sequence` order; steps sharing a sequence
number run in parallel (all must approve before the next sequence unlocks).
A rejection at any step halts the whole chain and flips the ECO to REJECTED.

Digital signatures: approving a step requires the user to re-submit their
password ("signature_pin") as an explicit re-authentication step (mirrors
21 CFR Part 11 / typical e-signature requirements: knowledge-based
re-authentication at the moment of signing, not just an already-open
session). We store a SHA-256 hash of a canonical signing payload
(user id + eco id + step id + decision + timestamp) as tamper-evidence,
never the password itself.
"""
import hashlib
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import verify_password
from app.models.approval import ApprovalStep, ApprovalStepStatus
from app.models.eco import ECO, ECOClass, ECOStatus
from app.models.user import User, UserRole
from app.services import audit_service, notification_service

# Ordered approval templates per change classification.
APPROVAL_TEMPLATES: dict[ECOClass, list[list[UserRole]]] = {
    ECOClass.MINOR: [
        [UserRole.ENGINEER],
        [UserRole.QUALITY],
    ],
    ECOClass.MAJOR: [
        [UserRole.ENGINEER],
        [UserRole.QUALITY, UserRole.MANUFACTURING],  # parallel step
        [UserRole.PROCUREMENT],
        [UserRole.APPROVER],  # final management sign-off
    ],
    ECOClass.EMERGENCY: [
        [UserRole.QUALITY, UserRole.ENGINEER],  # parallel, expedited
        [UserRole.APPROVER],
    ],
}


async def build_approval_chain(db: AsyncSession, eco: ECO) -> list[ApprovalStep]:
    template = APPROVAL_TEMPLATES[eco.eco_class]
    steps: list[ApprovalStep] = []
    for seq_index, roles in enumerate(template, start=1):
        for role in roles:
            step = ApprovalStep(
                eco_id=eco.id,
                sequence=seq_index,
                required_role=role,
                status=ApprovalStepStatus.PENDING,
            )
            db.add(step)
            steps.append(step)
    await db.flush()
    # activate the first sequence
    await _activate_sequence(db, eco.id, 1)
    return steps


async def _activate_sequence(db: AsyncSession, eco_id: int, sequence: int) -> None:
    result = await db.execute(
        select(ApprovalStep).where(ApprovalStep.eco_id == eco_id, ApprovalStep.sequence == sequence)
    )
    for step in result.scalars():
        if step.status == ApprovalStepStatus.PENDING:
            step.status = ApprovalStepStatus.ACTIVE
    await db.flush()


async def get_active_steps(db: AsyncSession, eco_id: int) -> list[ApprovalStep]:
    result = await db.execute(
        select(ApprovalStep).where(
            ApprovalStep.eco_id == eco_id, ApprovalStep.status == ApprovalStepStatus.ACTIVE
        )
    )
    return list(result.scalars().all())


def _sign_hash(user_id: int, eco_id: int, step_id: int, approve: bool, ts: datetime) -> str:
    payload = f"{user_id}:{eco_id}:{step_id}:{approve}:{ts.isoformat()}"
    return hashlib.sha256(payload.encode()).hexdigest()


async def decide_step(
    db: AsyncSession,
    *,
    eco: ECO,
    step: ApprovalStep,
    user: User,
    approve: bool,
    comments: str | None,
    signature_pin: str,
    ip_address: str | None,
) -> ApprovalStep:
    if step.status != ApprovalStepStatus.ACTIVE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This approval step is not currently active.")
    if user.role != step.required_role and user.role != UserRole.ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"This step requires role '{step.required_role.value}'.",
        )
    if not verify_password(signature_pin, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Signature authentication failed. Re-enter your password.")

    now = datetime.now(timezone.utc)
    before = {"status": step.status.value}

    step.approver_id = user.id
    step.comments = comments
    step.signed_at = now
    step.signed_ip_address = ip_address
    step.signature_hash = _sign_hash(user.id, eco.id, step.id, approve, now)
    step.status = ApprovalStepStatus.APPROVED if approve else ApprovalStepStatus.REJECTED

    await db.flush()
    await audit_service.record(
        db,
        actor=user,
        action="eco.approval_step_signed",
        entity_type="ApprovalStep",
        entity_id=step.id,
        before_state=before,
        after_state={"status": step.status.value},
        metadata={"eco_id": eco.id, "signature_hash": step.signature_hash},
        ip_address=ip_address,
    )

    if not approve:
        eco.status = ECOStatus.REJECTED
        await db.flush()
        await notification_service.notify_eco_rejected(db, eco, step)
        return step

    await _advance_chain_if_ready(db, eco)
    return step


async def _advance_chain_if_ready(db: AsyncSession, eco: ECO) -> None:
    result = await db.execute(select(ApprovalStep).where(ApprovalStep.eco_id == eco.id))
    all_steps = list(result.scalars().all())
    by_sequence: dict[int, list[ApprovalStep]] = {}
    for s in all_steps:
        by_sequence.setdefault(s.sequence, []).append(s)

    max_seq = max(by_sequence.keys())
    for seq in sorted(by_sequence.keys()):
        steps = by_sequence[seq]
        if all(s.status == ApprovalStepStatus.APPROVED for s in steps):
            if seq == max_seq:
                eco.status = ECOStatus.APPROVED
                await notification_service.notify_eco_approved(db, eco)
            else:
                next_seq = seq + 1
                if any(s.status == ApprovalStepStatus.PENDING for s in by_sequence.get(next_seq, [])):
                    await _activate_sequence(db, eco.id, next_seq)
                    await notification_service.notify_approvers_active(db, eco, next_seq)
        else:
            break
    await db.flush()


async def load_eco_with_chain(db: AsyncSession, eco_id: int) -> ECO | None:
    result = await db.execute(
        select(ECO)
        .options(selectinload(ECO.approval_chain).selectinload(ApprovalStep.approver))
        .where(ECO.id == eco_id)
    )
    return result.scalar_one_or_none()
