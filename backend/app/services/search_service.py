"""
Unified search across the core entities. Uses simple ILIKE matching, which
is sufficient at typical single-plant part-catalog scale (tens of
thousands of rows); the query shape is isolated here so it can be swapped
for PostgreSQL full-text (tsvector) or an external index (e.g. OpenSearch)
without touching API routes.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eco import ECO
from app.models.ecr import ECR
from app.models.part import Part


async def global_search(db: AsyncSession, query: str, limit_per_type: int = 10) -> dict:
    like = f"%{query}%"

    parts_result = await db.execute(
        select(Part).where((Part.part_number.ilike(like)) | (Part.name.ilike(like))).limit(limit_per_type)
    )
    ecrs_result = await db.execute(
        select(ECR).where((ECR.ecr_number.ilike(like)) | (ECR.title.ilike(like))).limit(limit_per_type)
    )
    ecos_result = await db.execute(
        select(ECO).where((ECO.eco_number.ilike(like)) | (ECO.title.ilike(like))).limit(limit_per_type)
    )

    return {
        "parts": [
            {"id": p.id, "part_number": p.part_number, "name": p.name, "status": p.status.value}
            for p in parts_result.scalars().all()
        ],
        "ecrs": [
            {"id": e.id, "ecr_number": e.ecr_number, "title": e.title, "status": e.status.value}
            for e in ecrs_result.scalars().all()
        ],
        "ecos": [
            {"id": e.id, "eco_number": e.eco_number, "title": e.title, "status": e.status.value}
            for e in ecos_result.scalars().all()
        ],
    }
