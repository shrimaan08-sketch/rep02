"""
AI-generated summaries of engineering changes, using the Anthropic API.

Purpose: ECRs/ECOs are often dense with part numbers, revision codes, and
engineering jargon. This service produces a short, plain-English summary
suitable for cross-functional stakeholders (e.g. a procurement manager who
doesn't need the full GD&T callout, just "what changed and why it matters").

Fails soft: if no API key is configured or the call errors, callers get
`None` back and the rest of the request proceeds normally — AI summaries
are an enhancement, never a blocking dependency.
"""
import logging

from anthropic import AsyncAnthropic

from app.core.config import settings

logger = logging.getLogger("eco_platform.ai")

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic | None:
    global _client
    if not settings.ai_enabled:
        return None
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


SYSTEM_PROMPT = (
    "You are an assistant embedded in a manufacturing Engineering Change Order platform. "
    "Summarize the engineering change described below in 3-5 plain-English sentences for a "
    "cross-functional audience (procurement, quality, manufacturing, management) who are not "
    "necessarily engineers. State: (1) what is changing, (2) why, (3) what parts/areas are "
    "affected, and (4) any notable risk or urgency. Do not invent facts not present in the input. "
    "Do not use markdown headers or bullet lists — write flowing prose."
)


async def summarize_change(*, title: str, description: str, reason: str | None = None,
                            justification: str | None = None, affected_parts: list[str] | None = None) -> str | None:
    client = _get_client()
    if client is None:
        return None

    parts_line = f"Affected parts: {', '.join(affected_parts)}" if affected_parts else "Affected parts: not yet specified"
    user_content = (
        f"Title: {title}\n"
        f"Reason code: {reason or 'n/a'}\n"
        f"Description: {description}\n"
        f"Justification: {justification or 'n/a'}\n"
        f"{parts_line}"
    )

    try:
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=400,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        text_blocks = [block.text for block in response.content if getattr(block, "type", None) == "text"]
        return "\n".join(text_blocks).strip() or None
    except Exception:
        logger.exception("AI summary generation failed")
        return None
