import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import (
    Supplier,
    SupplierNotification,
    SupplierNotificationStatus,
)
from app.models.eco import ECO
from app.models.user import User
from app.schemas.misc import SupplierCreate
from app.services import audit_service, notification_service

logger = logging.getLogger("eco_platform.supplier_service")


async def create_supplier(db: AsyncSession, data: SupplierCreate, actor: User) -> Supplier:
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="supplier.created", entity_type="Supplier", entity_id=supplier.id,
        after_state={"name": supplier.name},
    )
    await db.commit()
    await db.refresh(supplier)
    return supplier


async def list_suppliers(db: AsyncSession) -> list[Supplier]:
    result = await db.execute(select(Supplier).order_by(Supplier.name))
    return list(result.scalars().all())


async def _get_notification_with_supplier(db: AsyncSession, notification_id: int) -> SupplierNotification:
    """Re-fetches a notification with its `supplier` relationship
    eager-loaded, since SupplierNotificationRead serializes that nested
    object and async SQLAlchemy cannot lazy-load it outside an awaited
    query."""
    result = await db.execute(
        select(SupplierNotification)
        .options(selectinload(SupplierNotification.supplier))
        .where(SupplierNotification.id == notification_id)
    )
    return result.scalar_one()


async def notify_supplier_of_eco(
    db: AsyncSession, *, eco: ECO, supplier_id: int, message: str | None, actor: User,
) -> SupplierNotification:
    supplier = await db.get(Supplier, supplier_id)
    if supplier is None:
        raise ValueError("Supplier not found")

    notification = SupplierNotification(
        eco_id=eco.id, supplier_id=supplier_id, message=message, status=SupplierNotificationStatus.PENDING,
    )
    db.add(notification)
    await db.flush()

    try:
        await notification_service.notify_supplier(supplier.contact_email, supplier.name, eco, message)
        notification.status = SupplierNotificationStatus.SENT
    except Exception:
        logger.exception("Failed to notify supplier %s for ECO %s", supplier_id, eco.id)
        notification.status = SupplierNotificationStatus.FAILED

    await audit_service.record(
        db, actor=actor, action="supplier.notified", entity_type="SupplierNotification", entity_id=notification.id,
        after_state={"eco_id": eco.id, "supplier_id": supplier_id, "status": notification.status.value},
    )
    await db.commit()
    return await _get_notification_with_supplier(db, notification.id)


async def acknowledge_notification(db: AsyncSession, notification: SupplierNotification, notes: str | None, actor: User):
    notification.status = SupplierNotificationStatus.ACKNOWLEDGED
    notification.acknowledgement_notes = notes
    await db.flush()
    await audit_service.record(
        db, actor=actor, action="supplier.acknowledged", entity_type="SupplierNotification",
        entity_id=notification.id, after_state={"acknowledgement_notes": notes},
    )
    await db.commit()
    return await _get_notification_with_supplier(db, notification.id)


async def list_notifications_for_eco(db: AsyncSession, eco_id: int) -> list[SupplierNotification]:
    result = await db.execute(
        select(SupplierNotification)
        .options(selectinload(SupplierNotification.supplier))
        .where(SupplierNotification.eco_id == eco_id)
    )
    return list(result.scalars().all())
