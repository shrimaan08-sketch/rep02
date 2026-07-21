import pytest

from app.core.security import hash_password
from app.models.approval import ApprovalStepStatus
from app.models.eco import ECOStatus
from app.models.user import User, UserRole
from app.schemas.eco import ECOCreate
from app.services import approval_service, eco_service


async def _make_user(db_session, email, role) -> User:
    user = User(email=email, full_name=email, hashed_password=hash_password("pw123456"), role=role)
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_major_eco_builds_four_sequence_chain(db_session):
    engineer = await _make_user(db_session, "eng@test.local", UserRole.ENGINEER)
    eco = await eco_service.create_eco(
        db_session,
        ECOCreate(title="Update housing material", description="Switch to flame-retardant resin."),
        engineer,
    )
    eco = await eco_service.submit_for_approval(db_session, eco, engineer)

    sequences = sorted({s.sequence for s in eco.approval_chain})
    assert sequences == [1, 2, 3, 4]

    active_steps = [s for s in eco.approval_chain if s.status == ApprovalStepStatus.ACTIVE]
    assert len(active_steps) == 1
    assert active_steps[0].required_role == UserRole.ENGINEER


@pytest.mark.asyncio
async def test_full_approval_chain_reaches_approved_status(db_session):
    engineer = await _make_user(db_session, "eng2@test.local", UserRole.ENGINEER)
    quality = await _make_user(db_session, "qa2@test.local", UserRole.QUALITY)
    mfg = await _make_user(db_session, "mfg2@test.local", UserRole.MANUFACTURING)
    procurement = await _make_user(db_session, "proc2@test.local", UserRole.PROCUREMENT)
    manager = await _make_user(db_session, "mgr2@test.local", UserRole.APPROVER)

    eco = await eco_service.create_eco(
        db_session,
        ECOCreate(title="Second source connector", description="Add approved alternate supplier."),
        engineer,
    )
    eco = await eco_service.submit_for_approval(db_session, eco, engineer)

    async def approve_role(role_user):
        eco_with_chain = await approval_service.load_eco_with_chain(db_session, eco.id)
        step = next(s for s in eco_with_chain.approval_chain if s.status == ApprovalStepStatus.ACTIVE and s.required_role == role_user.role)
        await approval_service.decide_step(
            db_session, eco=eco_with_chain, step=step, user=role_user, approve=True,
            comments="Looks good", signature_pin="pw123456", ip_address="127.0.0.1",
        )

    await approve_role(engineer)
    await approve_role(quality)
    await approve_role(mfg)
    await approve_role(procurement)
    await approve_role(manager)

    final = await eco_service.get_eco(db_session, eco.id)
    assert final.status == ECOStatus.APPROVED


@pytest.mark.asyncio
async def test_rejection_halts_chain(db_session):
    engineer = await _make_user(db_session, "eng3@test.local", UserRole.ENGINEER)
    quality = await _make_user(db_session, "qa3@test.local", UserRole.QUALITY)

    eco = await eco_service.create_eco(
        db_session,
        ECOCreate(title="Reduce wall thickness", description="Cost reduction attempt."),
        engineer,
    )
    eco = await eco_service.submit_for_approval(db_session, eco, engineer)

    eco_with_chain = await approval_service.load_eco_with_chain(db_session, eco.id)
    eng_step = next(s for s in eco_with_chain.approval_chain if s.required_role == UserRole.ENGINEER)
    await approval_service.decide_step(
        db_session, eco=eco_with_chain, step=eng_step, user=engineer, approve=False,
        comments="Fails structural analysis", signature_pin="pw123456", ip_address=None,
    )

    final = await eco_service.get_eco(db_session, eco.id)
    assert final.status == ECOStatus.REJECTED


@pytest.mark.asyncio
async def test_wrong_role_cannot_approve_step(db_session):
    from fastapi import HTTPException

    engineer = await _make_user(db_session, "eng4@test.local", UserRole.ENGINEER)
    viewer = await _make_user(db_session, "viewer4@test.local", UserRole.VIEWER)

    eco = await eco_service.create_eco(
        db_session, ECOCreate(title="Minor label update", description="Fix typo on label."), engineer,
    )
    eco = await eco_service.submit_for_approval(db_session, eco, engineer)
    eco_with_chain = await approval_service.load_eco_with_chain(db_session, eco.id)
    step = next(s for s in eco_with_chain.approval_chain if s.status == ApprovalStepStatus.ACTIVE)

    with pytest.raises(HTTPException) as exc_info:
        await approval_service.decide_step(
            db_session, eco=eco_with_chain, step=step, user=viewer, approve=True,
            comments=None, signature_pin="pw123456", ip_address=None,
        )
    assert exc_info.value.status_code == 403
