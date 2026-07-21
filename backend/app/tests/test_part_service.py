import pytest

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.part import BOMCreate, BOMItemCreate, PartCreate
from app.services import bom_service, part_service


async def _make_engineer(db_session) -> User:
    user = User(email="parts@test.local", full_name="Parts Tester",
                hashed_password=hash_password("pw"), role=UserRole.ENGINEER)
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_create_part_gets_initial_revision_a(db_session):
    engineer = await _make_engineer(db_session)
    part = await part_service.create_part(db_session, PartCreate(part_number="WID-100", name="Widget"), engineer)
    assert part.current_revision_id is not None

    full = await part_service.get_part(db_session, part.id, with_revisions=True)
    assert len(full.revisions) == 1
    assert full.revisions[0].revision_code == "A"


@pytest.mark.asyncio
async def test_duplicate_part_number_rejected(db_session):
    from fastapi import HTTPException

    engineer = await _make_engineer(db_session)
    await part_service.create_part(db_session, PartCreate(part_number="WID-200", name="Widget 2"), engineer)

    with pytest.raises(HTTPException) as exc_info:
        await part_service.create_part(db_session, PartCreate(part_number="WID-200", name="Duplicate"), engineer)
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_bom_creation_with_items(db_session):
    engineer = await _make_engineer(db_session)
    parent = await part_service.create_part(db_session, PartCreate(part_number="ASM-001", name="Assembly"), engineer)
    child = await part_service.create_part(db_session, PartCreate(part_number="CMP-001", name="Screw"), engineer)

    bom = await bom_service.create_bom(
        db_session,
        BOMCreate(
            parent_part_id=parent.id, parent_revision_id=parent.current_revision_id, name="Assembly BOM",
            items=[BOMItemCreate(child_part_id=child.id, quantity_per=4, reference_designator="S1-S4")],
        ),
        engineer,
    )
    assert len(bom.items) == 1
    assert bom.items[0].quantity_per == 4
