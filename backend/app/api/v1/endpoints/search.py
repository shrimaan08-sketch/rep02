from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import search_service

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
async def search(
    q: str = Query(min_length=1),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return await search_service.global_search(db, q)
