import pytest

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.eco import ECOCreate
from app.schemas.part import BOMCreate, BOMItemCreate, PartCreate
from app.services import bom_service, eco_service, impact_analysis_service, part_service


async def _make_engineer(db_session) -> User:
    user = User(email="impact@test.local", full_name="Impact Tester",
                hashed_password=hash_password("pw"), role=UserRole.ENGINEER)
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.mark.asyncio
async def test_impact_analysis_finds_upstream_assemblies(db_session):
    """Bracket -> Subassembly -> Final Assembly. Changing the bracket should
    surface both the subassembly and the final assembly as upstream impact."""
    engineer = await _make_engineer(db_session)

    bracket = await part_service.create_part(db_session, PartCreate(part_number="BRK-001", name="Mounting Bracket"), engineer)
    subassy = await part_service.create_part(db_session, PartCreate(part_number="SUB-001", name="Motor Subassembly"), engineer)
    final_assy = await part_service.create_part(db_session, PartCreate(part_number="FIN-001", name="Final Assembly"), engineer)

    await bom_service.create_bom(
        db_session,
        BOMCreate(
            parent_part_id=subassy.id, parent_revision_id=subassy.current_revision_id, name="Subassembly BOM",
            items=[BOMItemCreate(child_part_id=bracket.id, quantity_per=2)],
        ),
        engineer,
    )
    await bom_service.create_bom(
        db_session,
        BOMCreate(
            parent_part_id=final_assy.id, parent_revision_id=final_assy.current_revision_id, name="Final BOM",
            items=[BOMItemCreate(child_part_id=subassy.id, quantity_per=1)],
        ),
        engineer,
    )

    eco = await eco_service.create_eco(
        db_session,
        ECOCreate(
            title="Strengthen bracket", description="Increase bracket thickness for durability.",
            affected_parts=[{"part_id": bracket.id, "change_description": "Thickness increased 2mm"}],
        ),
        engineer,
    )

    result = await impact_analysis_service.analyze_eco_impact(db_session, eco)

    assert bracket.id in result.directly_affected_parts
    assert subassy.id in result.upstream_assemblies
    assert final_assy.id in result.upstream_assemblies
    assert result.total_impacted_part_count == 3
