from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    academic_level: str = "undergraduate"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    preferred_language: Optional[str] = None
    preferred_citation_style: Optional[str] = None
    preferred_ai_mode: Optional[str] = None
    academic_level: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    preferred_language: str
    preferred_citation_style: str
    preferred_ai_mode: str
    academic_level: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshRequest(BaseModel):
    refresh_token: str
