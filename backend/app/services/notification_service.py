"""
Email notification service. Sends real SMTP mail via aiosmtplib when
EMAIL_ENABLED=true and SMTP credentials are configured; otherwise messages
are logged (not silently dropped) so local/dev environments behave
predictably without requiring a mail server.
"""
import logging

import aiosmtplib
from email.message import EmailMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.approval import ApprovalStep
from app.models.eco import ECO
from app.models.user import User, UserRole

logger = logging.getLogger("eco_platform.notifications")


async def _send(to_addresses: list[str], subject: str, body: str) -> None:
    if not to_addresses:
        return
    if not settings.EMAIL_ENABLED:
        logger.info("[EMAIL disabled] To=%s Subject=%s\n%s", to_addresses, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = ", ".join(to_addresses)
    message["Subject"] = subject
    message.set_content(body)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_TLS,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to_addresses)


async def _users_with_role(db: AsyncSession, role: UserRole) -> list[User]:
    result = await db.execute(select(User).where(User.role == role, User.is_active.is_(True)))
    return list(result.scalars().all())


async def notify_approvers_active(db: AsyncSession, eco: ECO, sequence: int) -> None:
    result = await db.execute(
        select(ApprovalStep).where(ApprovalStep.eco_id == eco.id, ApprovalStep.sequence == sequence)
    )
    steps = result.scalars().all()
    roles = {s.required_role for s in steps}
    recipients: list[str] = []
    for role in roles:
        users = await _users_with_role(db, role)
        recipients.extend(u.email for u in users)
    await _send(
        recipients,
        subject=f"[Action needed] {eco.eco_number}: {eco.title}",
        body=(
            f"ECO {eco.eco_number} — {eco.title}\n\n"
            f"Your approval is now required for this engineering change order.\n\n"
            f"Description: {eco.description}\n\n"
            f"Please review and sign off in Revion."
        ),
    )


async def notify_eco_approved(db: AsyncSession, eco: ECO) -> None:
    result = await db.execute(select(User).where(User.id == eco.initiated_by_id))
    initiator = result.scalar_one_or_none()
    recipients = [initiator.email] if initiator else []
    await _send(
        recipients,
        subject=f"[Approved] {eco.eco_number}: {eco.title}",
        body=f"ECO {eco.eco_number} has completed its full approval chain and is now APPROVED.",
    )


async def notify_eco_rejected(db: AsyncSession, eco: ECO, step: ApprovalStep) -> None:
    result = await db.execute(select(User).where(User.id == eco.initiated_by_id))
    initiator = result.scalar_one_or_none()
    recipients = [initiator.email] if initiator else []
    await _send(
        recipients,
        subject=f"[Rejected] {eco.eco_number}: {eco.title}",
        body=(
            f"ECO {eco.eco_number} was rejected at the {step.required_role.value} step.\n\n"
            f"Comments: {step.comments or '(none provided)'}"
        ),
    )


async def notify_supplier(to_email: str, supplier_name: str, eco: ECO, message: str | None) -> None:
    await _send(
        [to_email],
        subject=f"Engineering Change Notification: {eco.eco_number}",
        body=(
            f"Dear {supplier_name},\n\n"
            f"This is a formal notification of an engineering change that may affect parts you supply.\n\n"
            f"ECO Number: {eco.eco_number}\n"
            f"Title: {eco.title}\n"
            f"Effectivity Date: {eco.effectivity_date or 'TBD'}\n\n"
            f"Description:\n{eco.description}\n\n"
            f"{message or ''}\n\n"
            f"Please acknowledge receipt of this notification and confirm your ability to support the "
            f"revised specification by the effectivity date."
        ),
    )
