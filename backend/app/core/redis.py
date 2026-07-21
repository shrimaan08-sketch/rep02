"""Async Redis client for caching hot dashboard queries and rate-limiting
login attempts.

Redis is OPTIONAL. If REDIS_URL is not configured (settings.redis_enabled is
False) or Redis is unreachable at runtime, every helper here fails open:
cache reads return None (cache miss), cache writes are no-ops, and the rate
limiter returns a low counter value so it never blocks a legitimate user just
because Redis is down. This keeps the app fully functional on a minimal
Render setup (web + database only, no Redis add-on).
"""
import json
import logging
from typing import Any

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger("revion.redis")

_redis_pool: redis.Redis | None = None
_unavailable_logged = False


def get_redis() -> redis.Redis | None:
    global _redis_pool
    if not settings.redis_enabled:
        return None
    if _redis_pool is None:
        _redis_pool = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_pool


def _note_unavailable(exc: Exception) -> None:
    global _unavailable_logged
    if not _unavailable_logged:
        logger.warning("Redis unavailable, continuing without cache/rate-limit: %s", exc)
        _unavailable_logged = True


async def cache_get_json(key: str) -> Any | None:
    client = get_redis()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        return json.loads(raw) if raw else None
    except Exception as exc:  # noqa: BLE001
        _note_unavailable(exc)
        return None


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 60) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception as exc:  # noqa: BLE001
        _note_unavailable(exc)


async def cache_invalidate_prefix(prefix: str) -> None:
    client = get_redis()
    if client is None:
        return
    try:
        async for key in client.scan_iter(match=f"{prefix}*"):
            await client.delete(key)
    except Exception as exc:  # noqa: BLE001
        _note_unavailable(exc)


async def incr_with_expiry(key: str, ttl_seconds: int) -> int:
    """Login rate limiting: increments a counter, setting TTL on first hit.

    Returns 0 when Redis is unavailable so callers treat it as "well under
    the limit" and never lock anyone out due to infrastructure issues.
    """
    client = get_redis()
    if client is None:
        return 0
    try:
        value = await client.incr(key)
        if value == 1:
            await client.expire(key, ttl_seconds)
        return value
    except Exception as exc:  # noqa: BLE001
        _note_unavailable(exc)
        return 0
