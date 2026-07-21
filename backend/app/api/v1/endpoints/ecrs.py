from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.ecr import ECRStatus
from app.models.user import User, UserRole
from app.schemas.ecr import ECRCreate, ECRRead, ECRStatusChange, ECRUpdate
from app.schemas.misc import PaginatedResponse
from app.services import ecr_service

router = APIRouter(prefix="/ecrs", tags=["Engineering Change Requests"])


@router.post("", response_model=ECRRead, status_code=status.HTTP_201_CREATED)
async def create_ecr(
    payload: ECRCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.QUALITY, UserRole.MANUFACTURING)),
):
    return await ecr_service.create_ecr(db, payload, user)


@router.get("", response_model=PaginatedResponse[ECRRead])
async def list_ecrs(
    status_filter: ECRStatus | None = Query(None, alias="status"),
    search: str | None = None,
    page: int = 1,
    page_size: int = settings.DEFAULT_PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    page_size = min(page_size, settings.MAX_PAGE_SIZE)
    ecrs, total = await ecr_service.list_ecrs(db, status_filter=status_filter, search=search, page=page, page_size=page_size)
    return PaginatedResponse(total=total, page=page, page_size=page_size, items=[ECRRead.model_validate(e) for e in ecrs])


@router.get("/{ecr_id}", response_model=ECRRead)
async def get_ecr(ecr_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    ecr = await ecr_service.get_ecr(db, ecr_id)
    if not ecr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECR not found.")
    return ecr


@router.patch("/{ecr_id}", response_model=ECRRead)
async def update_ecr(
    ecr_id: int,
    payload: ECRUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.QUALITY, UserRole.MANUFACTURING)),
):
    ecr = await ecr_service.get_ecr(db, ecr_id)
    if not ecr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECR not found.")
    return await ecr_service.update_ecr(db, ecr, payload, user)


@router.post("/{ecr_id}/status", response_model=ECRRead)
async def change_ecr_status(
    ecr_id: int,
    payload: ECRStatusChange,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.QUALITY, UserRole.MANUFACTURING, UserRole.APPROVER)),
):
    ecr = await ecr_service.get_ecr(db, ecr_id)
    if not ecr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECR not found.")
    return await ecr_service.change_status(db, ecr, payload.status, payload.comments, user)
