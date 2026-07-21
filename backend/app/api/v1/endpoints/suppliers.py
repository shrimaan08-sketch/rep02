from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.misc import (
    SupplierCreate,
    SupplierNotificationCreate,
    SupplierNotificationRead,
    SupplierRead,
)
from app.services import eco_service, supplier_service

router = APIRouter(tags=["Suppliers"])


@router.post("/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PROCUREMENT, UserRole.ENGINEER)),
):
    return await supplier_service.create_supplier(db, payload, user)


@router.get("/suppliers", response_model=list[SupplierRead])
async def list_suppliers(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return await supplier_service.list_suppliers(db)


@router.post("/supplier-notifications", response_model=SupplierNotificationRead, status_code=status.HTTP_201_CREATED)
async def notify_supplier(
    payload: SupplierNotificationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PROCUREMENT, UserRole.ENGINEER)),
):
    eco = await eco_service.get_eco(db, payload.eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await supplier_service.notify_supplier_of_eco(
        db, eco=eco, supplier_id=payload.supplier_id, message=payload.message, actor=user,
    )


@router.get("/ecos/{eco_id}/supplier-notifications", response_model=list[SupplierNotificationRead])
async def list_notifications(eco_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return await supplier_service.list_notifications_for_eco(db, eco_id)


@router.post("/supplier-notifications/{notification_id}/acknowledge", response_model=SupplierNotificationRead)
async def acknowledge_notification(
    notification_id: int,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PROCUREMENT, UserRole.ENGINEER)),
):
    from app.models.document import SupplierNotification
    notification = await db.get(SupplierNotification, notification_id)
    if not notification:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    return await supplier_service.acknowledge_notification(db, notification, notes, user)
