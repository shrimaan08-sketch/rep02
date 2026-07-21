"""
Centralized audit logging. Every service that mutates state calls
`record()` so there is exactly one code path writing to the audit_logs
table — this keeps the trail consistent and impossible to accidentally skip.
"""
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


async def record(
    db: AsyncSession,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: Any,
    before_state: dict | None = None,
    after_state: dict | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    commit: bool = False,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor.id if actor else None,
        actor_email=actor.email if actor else "system",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before_state=before_state,
        after_state=after_state,
        metadata_json=metadata,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    if commit:
        await db.commit()
    return entry
