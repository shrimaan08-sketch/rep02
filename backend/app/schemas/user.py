from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    department: str | None = None
    title: str | None = None
    role: UserRole = UserRole.VIEWER


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    title: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)


class GoogleAuthRequest(BaseModel):
    # The Google ID token (a JWT) returned by Google Identity Services.
    credential: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str
