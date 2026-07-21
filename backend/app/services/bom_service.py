from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.part import BOM, BOMItem
from app.models.user import User
from app.schemas.part import BOMCreate, BOMItemCreate
from app.services import audit_service


async def create_bom(db: AsyncSession, data: BOMCreate, actor: User) -> BOM:
    bom = BOM(
        parent_part_id=data.parent_part_id,
        parent_revision_id=data.parent_revision_id,
        name=data.name,
        notes=data.notes,
    )
    db.add(bom)
    await db.flush()

    for idx, item in enumerate(data.items, start=1):
        db.add(
            BOMItem(
                bom_id=bom.id,
                line_number=item.line_number or idx,
                child_part_id=item.child_part_id,
                child_revision_id=item.child_revision_id,
                quantity_per=item.quantity_per,
                reference_designator=item.reference_designator,
                find_number=item.find_number,
                notes=item.notes,
            )
        )
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="bom.created", entity_type="BOM", entity_id=bom.id,
        after_state={"parent_part_id": data.parent_part_id, "item_count": len(data.items)},
    )
    await db.commit()

    return await get_bom(db, bom.id)


async def get_bom(db: AsyncSession, bom_id: int) -> BOM | None:
    result = await db.execute(
        select(BOM)
        .options(selectinload(BOM.items).selectinload(BOMItem.child_part))
        .where(BOM.id == bom_id)
    )
    return result.scalar_one_or_none()


async def list_boms_for_part(db: AsyncSession, part_id: int) -> list[BOM]:
    result = await db.execute(
        select(BOM)
        .options(selectinload(BOM.items).selectinload(BOMItem.child_part))
        .where(BOM.parent_part_id == part_id)
        .order_by(BOM.created_at.desc())
    )
    return list(result.scalars().all())


async def add_bom_item(db: AsyncSession, bom: BOM, item_data: BOMItemCreate, actor: User) -> BOMItem:
    max_line_result = await db.execute(select(BOMItem).where(BOMItem.bom_id == bom.id))
    existing_items = max_line_result.scalars().all()
    next_line = max((i.line_number for i in existing_items), default=0) + 1

    item = BOMItem(
        bom_id=bom.id,
        line_number=item_data.line_number or next_line,
        child_part_id=item_data.child_part_id,
        child_revision_id=item_data.child_revision_id,
        quantity_per=item_data.quantity_per,
        reference_designator=item_data.reference_designator,
        find_number=item_data.find_number,
        notes=item_data.notes,
    )
    db.add(item)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="bom.item_added", entity_type="BOMItem", entity_id=item.id,
        after_state={"bom_id": bom.id, "child_part_id": item_data.child_part_id},
    )
    await db.commit()

    result = await db.execute(
        select(BOMItem).options(selectinload(BOMItem.child_part)).where(BOMItem.id == item.id)
    )
    return result.scalar_one()


async def remove_bom_item(db: AsyncSession, item: BOMItem, actor: User) -> None:
    bom_id, item_id = item.bom_id, item.id
    await db.delete(item)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="bom.item_removed", entity_type="BOMItem", entity_id=item_id,
        before_state={"bom_id": bom_id},
    )
    await db.commit()
