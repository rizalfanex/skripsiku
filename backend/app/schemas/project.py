from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=500)
    description: str = ""
    document_type: str = "thesis"
    academic_field: str = ""
    academic_level: str = "undergraduate"
    language: str = "id"
    citation_style: str = "apa"
    ai_mode: str = "instant"


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[str] = None
    academic_field: Optional[str] = None
    language: Optional[str] = None
    citation_style: Optional[str] = None
    ai_mode: Optional[str] = None
    status: Optional[str] = None


class ProjectPublic(BaseModel):
    id: str
    title: str
    description: str
    document_type: str
    academic_field: str
    academic_level: str
    language: str
    citation_style: str
    ai_mode: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
