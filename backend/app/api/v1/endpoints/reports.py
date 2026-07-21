import logging

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import cache_get_json, cache_set_json
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import report_service

logger = logging.getLogger("eco_platform.reports")

router = APIRouter(tags=["Reporting"])


@router.get("/dashboard/metrics")
async def dashboard_metrics(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    try:
        cached = await cache_get_json("dashboard:metrics")
        if cached is not None:
            return cached
    except Exception:
        logger.warning("Dashboard metrics cache read failed (Redis down?); computing directly.")

    metrics = await report_service.dashboard_metrics(db)

    try:
        await cache_set_json("dashboard:metrics", metrics, ttl_seconds=30)
    except Exception:
        logger.warning("Dashboard metrics cache write failed (Redis down?); serving uncached.")

    return metrics


@router.get("/reports/eco-register.csv")
async def eco_register_csv(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    csv_content = await report_service.export_eco_register_csv(db)
    return Response(
        content=csv_content, media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=eco_register.csv"},
    )


@router.get("/reports/eco-register.pdf")
async def eco_register_pdf(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    pdf_bytes = await report_service.export_eco_register_pdf(db)
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=eco_register.pdf"},
    )
