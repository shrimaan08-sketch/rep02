"""
Generates human-readable, gapless-enough sequential identifiers for ECRs
and ECOs, e.g. ECR-2026-000042. Uses a Redis INCR as the fast path (atomic,
no DB lock contention) with the current year baked into the key so counters
naturally reset each calendar year. Redis is treated as a cache of the
"next number" — if it's ever unavailable we fall back to a DB count query,
so numbering never blocks the request path.
"""
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models.ecr import ECR
from app.models.eco import ECO


async def _next_sequence(db: AsyncSession, redis_key: str, model, number_column) -> int:
    try:
        client = get_redis()
        value = await client.incr(redis_key)
        if value == 1:
            # first use this year: seed from DB in case Redis was flushed/rotated
            result = await db.execute(select(func.count()).select_from(model))
            existing_count = result.scalar_one()
            if existing_count > value:
                value = await client.incrby(redis_key, existing_count - value + 1)
        return value
    except Exception:
        result = await db.execute(select(func.count()).select_from(model))
        return result.scalar_one() + 1


async def generate_ecr_number(db: AsyncSession) -> str:
    year = datetime.utcnow().year
    seq = await _next_sequence(db, f"seq:ecr:{year}", ECR, ECR.ecr_number)
    return f"ECR-{year}-{seq:06d}"


async def generate_eco_number(db: AsyncSession) -> str:
    year = datetime.utcnow().year
    seq = await _next_sequence(db, f"seq:eco:{year}", ECO, ECO.eco_number)
    return f"ECO-{year}-{seq:06d}"
