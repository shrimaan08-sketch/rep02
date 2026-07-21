import pytest

from app.core.security import hash_password
from app.models.ecr import ECRPriority, ECRReasonCode, ECRStatus
from app.models.user import User, UserRole
from app.schemas.ecr import ECRCreate
from app.services import ecr_service


async def _make_engineer(db_session) -> User:
    user = User(
        email="engineer@test.local", full_name="Test Engineer",
        hashed_password=hash_password("pw"), role=UserRole.ENGINEER,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_create_ecr_assigns_sequential_number(db_session):
    engineer = await _make_engineer(db_session)
    payload = ECRCreate(
        title="Switch to RoHS-compliant connector",
        description="Current connector is being discontinued by supplier.",
        reason_code=ECRReasonCode.OBSOLESCENCE,
        priority=ECRPriority.HIGH,
    )
    ecr = await ecr_service.create_ecr(db_session, payload, engineer)
    assert ecr.ecr_number.startswith("ECR-")
    assert ecr.status == ECRStatus.DRAFT


@pytest.mark.asyncio
async def test_valid_transition_draft_to_submitted(db_session):
    engineer = await _make_engineer(db_session)
    payload = ECRCreate(
        title="Improve bracket tolerance",
        description="Field returns show tolerance stack-up issue.",
        reason_code=ECRReasonCode.QUALITY_ISSUE,
    )
    ecr = await ecr_service.create_ecr(db_session, payload, engineer)
    updated = await ecr_service.change_status(db_session, ecr, ECRStatus.SUBMITTED, "Ready for review", engineer)
    assert updated.status == ECRStatus.SUBMITTED


@pytest.mark.asyncio
async def test_invalid_transition_is_rejected(db_session):
    from fastapi import HTTPException

    engineer = await _make_engineer(db_session)
    payload = ECRCreate(
        title="Change label material",
        description="Label peels off in humid environments.",
        reason_code=ECRReasonCode.QUALITY_ISSUE,
    )
    ecr = await ecr_service.create_ecr(db_session, payload, engineer)

    with pytest.raises(HTTPException) as exc_info:
        await ecr_service.change_status(db_session, ecr, ECRStatus.CONVERTED, None, engineer)
    assert exc_info.value.status_code == 400
