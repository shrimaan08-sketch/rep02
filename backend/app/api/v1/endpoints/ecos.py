from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.eco import ECOStatus
from app.models.user import User, UserRole
from app.schemas.eco import (
    ApprovalDecision,
    ECOCreate,
    ECORead,
    ECOSummary,
    ECOUpdate,
    ImpactAnalysisResult,
)
from app.schemas.misc import PaginatedResponse
from app.services import approval_service, barcode_service, eco_service, impact_analysis_service

router = APIRouter(prefix="/ecos", tags=["Engineering Change Orders"])


@router.post("", response_model=ECORead, status_code=status.HTTP_201_CREATED)
async def create_eco(
    payload: ECOCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    return await eco_service.create_eco(db, payload, user)


@router.get("", response_model=PaginatedResponse[ECOSummary])
async def list_ecos(
    status_filter: ECOStatus | None = Query(None, alias="status"),
    search: str | None = None,
    page: int = 1,
    page_size: int = settings.DEFAULT_PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    page_size = min(page_size, settings.MAX_PAGE_SIZE)
    ecos, total = await eco_service.list_ecos(db, status_filter=status_filter, search=search, page=page, page_size=page_size)
    return PaginatedResponse(total=total, page=page, page_size=page_size, items=[ECOSummary.model_validate(e) for e in ecos])


@router.get("/{eco_id}", response_model=ECORead)
async def get_eco(eco_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return eco


@router.patch("/{eco_id}", response_model=ECORead)
async def update_eco(
    eco_id: int,
    payload: ECOUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await eco_service.update_eco(db, eco, payload, user)


@router.post("/{eco_id}/submit", response_model=ECORead)
async def submit_eco(
    eco_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await eco_service.submit_for_approval(db, eco, user)


@router.post("/{eco_id}/implement", response_model=ECORead)
async def implement_eco(
    eco_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER)),
):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await eco_service.mark_implemented(db, eco, user)


@router.post("/{eco_id}/close", response_model=ECORead)
async def close_eco(
    eco_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.QUALITY)),
):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await eco_service.close_eco(db, eco, user)


@router.post("/{eco_id}/cancel", response_model=ECORead)
async def cancel_eco(
    eco_id: int,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ENGINEER, UserRole.ADMIN)),
):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await eco_service.cancel_eco(db, eco, reason, user)


@router.get("/{eco_id}/impact-analysis", response_model=ImpactAnalysisResult)
async def get_impact_analysis(eco_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    return await impact_analysis_service.analyze_eco_impact(db, eco)


@router.get("/{eco_id}/qr-code")
async def get_eco_qr_code(eco_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    eco = await eco_service.get_eco(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    image_bytes = barcode_service.generate_qr_bytes(f"ECO:{eco.eco_number}")
    return Response(content=image_bytes, media_type="image/png")


# --- Approval actions ---

@router.get("/{eco_id}/approvals/pending", response_model=list)
async def my_pending_approvals(
    eco_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    steps = await approval_service.get_active_steps(db, eco_id)
    return [
        {"id": s.id, "sequence": s.sequence, "required_role": s.required_role.value}
        for s in steps
        if s.required_role == user.role or user.role == UserRole.ADMIN
    ]


@router.post("/{eco_id}/approvals/{step_id}/decision", response_model=ECORead)
async def decide_approval(
    eco_id: int,
    step_id: int,
    payload: ApprovalDecision,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    eco = await approval_service.load_eco_with_chain(db, eco_id)
    if not eco:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ECO not found.")
    step = next((s for s in eco.approval_chain if s.id == step_id), None)
    if not step:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Approval step not found.")

    client_ip = request.client.host if request.client else None
    await approval_service.decide_step(
        db, eco=eco, step=step, user=user, approve=payload.approve,
        comments=payload.comments, signature_pin=payload.signature_pin, ip_address=client_ip,
    )
    return await eco_service.get_eco(db, eco_id)
