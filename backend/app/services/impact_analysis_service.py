"""
Impact analysis: given the parts directly affected by an ECO, walks the BOM
graph upward (child -> parent) to find every assembly that transitively
consumes an affected part, and downward is implicit since BOMItem rows
already list direct children. This answers the question engineers actually
ask before approving a change: "what else breaks if I change this part?"

Implementation note: we do this in Python over an in-memory adjacency map
rather than a recursive CTE, since BOM depth in practice (assembly nesting)
is small (rarely > 6-8 levels) and this keeps the logic portable across the
async ORM without database-specific recursive SQL.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eco import ECO, ECOAffectedPart
from app.models.part import BOM, BOMItem
from app.schemas.eco import ImpactAnalysisResult


async def _build_child_to_parents_map(db: AsyncSession) -> dict[int, set[tuple[int, int]]]:
    """Returns {child_part_id: {(parent_part_id, bom_id), ...}}"""
    result = await db.execute(
        select(BOMItem.child_part_id, BOM.parent_part_id, BOM.id).join(BOM, BOMItem.bom_id == BOM.id)
    )
    mapping: dict[int, set[tuple[int, int]]] = {}
    for child_id, parent_id, bom_id in result.all():
        mapping.setdefault(child_id, set()).add((parent_id, bom_id))
    return mapping


async def analyze_eco_impact(db: AsyncSession, eco: ECO) -> ImpactAnalysisResult:
    result = await db.execute(select(ECOAffectedPart).where(ECOAffectedPart.eco_id == eco.id))
    affected_rows = result.scalars().all()
    direct_part_ids = {row.part_id for row in affected_rows}

    child_to_parents = await _build_child_to_parents_map(db)

    visited_parts: set[int] = set(direct_part_ids)
    affected_boms: set[int] = set()
    frontier = list(direct_part_ids)

    while frontier:
        current = frontier.pop()
        for parent_id, bom_id in child_to_parents.get(current, set()):
            affected_boms.add(bom_id)
            if parent_id not in visited_parts:
                visited_parts.add(parent_id)
                frontier.append(parent_id)

    upstream_only = visited_parts - direct_part_ids

    notes: list[str] = []
    if not direct_part_ids:
        notes.append("No parts have been linked to this ECO yet — impact analysis is incomplete.")
    if upstream_only:
        notes.append(
            f"{len(upstream_only)} upstream assembly/assemblies consume an affected part and should be "
            f"re-reviewed for form/fit/function before release."
        )

    return ImpactAnalysisResult(
        eco_id=eco.id,
        directly_affected_parts=sorted(direct_part_ids),
        upstream_assemblies=sorted(upstream_only),
        affected_boms=sorted(affected_boms),
        total_impacted_part_count=len(visited_parts),
        estimated_total_cost_impact=eco.estimated_cost_impact,
        notes=notes,
    )
