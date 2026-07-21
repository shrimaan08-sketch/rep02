from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.part import PartStatus
from app.models.user import User, UserRole
from app.schemas.misc import PaginatedResponse
from app.schemas.part import (
    BOMCreate,
    BOMItemCreate,
    BOMItemRead,
    BOMRead,
    PartCreate,
    PartRead,
    PartUpdate,
    PartWithRevisions,
)
from app.services import bom_service, part_service

router = APIRouter(tags=["Parts & BOMs"])


@router.post("/parts", response_model=PartRead, status_code=status.HTTP_201_CREATED)
async def create_part(
    payload: PartCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    return await part_service.create_part(db, payload, user)


@router.get("/parts", response_model=PaginatedResponse[PartRead])
async def list_parts(
    search: str | None = None,
    status_filter: PartStatus | None = Query(None, alias="status"),
    page: int = 1,
    page_size: int = settings.DEFAULT_PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    page_size = min(page_size, settings.MAX_PAGE_SIZE)
    parts, total = await part_service.list_parts(
        db, search=search, status_filter=status_filter, page=page, page_size=page_size
    )
    return PaginatedResponse(
        total=total, page=page, page_size=page_size,
        items=[PartRead.model_validate(p) for p in parts],
    )


@router.get("/parts/{part_id}", response_model=PartWithRevisions)
async def get_part(part_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    part = await part_service.get_part(db, part_id, with_revisions=True)
    if not part:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Part not found.")
    return part


@router.patch("/parts/{part_id}", response_model=PartRead)
async def update_part(
    part_id: int,
    payload: PartUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    part = await part_service.get_part(db, part_id)
    if not part:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Part not found.")
    return await part_service.update_part(db, part, payload, user)


@router.post("/parts/{part_id}/revisions", response_model=PartWithRevisions)
async def create_revision(
    part_id: int,
    revision_code: str,
    change_summary: str,
    specification: str | None = None,
    eco_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    part = await part_service.get_part(db, part_id)
    if not part:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Part not found.")
    await part_service.create_revision(
        db, part, revision_code=revision_code, change_summary=change_summary,
        specification=specification, eco_id=eco_id, actor=user,
    )
    return await part_service.get_part(db, part_id, with_revisions=True)


@router.post("/parts/revisions/{revision_id}/release", status_code=status.HTTP_200_OK)
async def release_revision(
    revision_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.QUALITY, UserRole.ENGINEER)),
):
    from app.models.part import PartRevision
    revision = await db.get(PartRevision, revision_id)
    if not revision:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Revision not found.")
    await part_service.release_revision(db, revision, user)
    return {"detail": f"Revision {revision.revision_code} released."}


# --- BOMs ---

@router.post("/boms", response_model=BOMRead, status_code=status.HTTP_201_CREATED)
async def create_bom(
    payload: BOMCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    return await bom_service.create_bom(db, payload, user)


@router.get("/boms/{bom_id}", response_model=BOMRead)
async def get_bom(bom_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    bom = await bom_service.get_bom(db, bom_id)
    if not bom:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "BOM not found.")
    return bom


@router.get("/parts/{part_id}/boms", response_model=list[BOMRead])
async def list_boms_for_part(part_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return await bom_service.list_boms_for_part(db, part_id)


@router.post("/boms/{bom_id}/items", response_model=BOMItemRead, status_code=status.HTTP_201_CREATED)
async def add_bom_item(
    bom_id: int,
    payload: BOMItemCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    bom = await bom_service.get_bom(db, bom_id)
    if not bom:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "BOM not found.")
    return await bom_service.add_bom_item(db, bom, payload, user)


@router.delete("/boms/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bom_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    from app.models.part import BOMItem
    item = await db.get(BOMItem, item_id)
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "BOM item not found.")
    await bom_service.remove_bom_item(db, item, user)
