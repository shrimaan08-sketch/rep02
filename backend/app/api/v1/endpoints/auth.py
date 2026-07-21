from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.redis import incr_with_expiry
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    require_roles,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, RefreshRequest, Token, UserCreate, UserRead
from app.services import audit_service

logger = logging.getLogger("eco_platform.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_LOGIN_ATTEMPTS_PER_WINDOW = 10
LOGIN_WINDOW_SECONDS = 300


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    try:
        attempts = await incr_with_expiry(f"login_attempts:{client_ip}", LOGIN_WINDOW_SECONDS)
        if attempts > MAX_LOGIN_ATTEMPTS_PER_WINDOW:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many login attempts. Try again later.")
    except HTTPException:
        raise
    except Exception:
        # Rate limiting is defense-in-depth, not core functionality -- if
        # Redis is unreachable we log and fail open rather than taking
        # authentication down with it.
        logger.warning("Login rate limiter unavailable (Redis down?); proceeding without rate limiting.")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        await audit_service.record(
            db, actor=None, action="auth.login_failed", entity_type="User", entity_id=payload.email,
            metadata={"ip": client_ip}, ip_address=client_ip, commit=True,
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")

    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id))

    await audit_service.record(
        db, actor=user, action="auth.login_success", entity_type="User", entity_id=user.id,
        ip_address=client_ip, commit=True,
    )

    return Token(access_token=access_token, refresh_token=refresh_token, user=UserRead.model_validate(user))


@router.post("/refresh", response_model=Token)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token.")

    user = await db.get(User, int(decoded["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive.")

    access_token = create_access_token(str(user.id), user.role.value)
    new_refresh = create_refresh_token(str(user.id))
    return Token(access_token=access_token, refresh_token=new_refresh, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
        title=payload.title,
    )
    db.add(user)
    await db.flush()
    await audit_service.record(
        db, actor=_admin, action="user.created", entity_type="User", entity_id=user.id,
        after_state={"email": user.email, "role": user.role.value}, commit=True,
    )
    await db.refresh(user)
    return user
