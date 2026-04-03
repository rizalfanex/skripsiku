from __future__ import annotations
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # User preferences (stored as JSON string for SQLite compatibility)
    preferred_language: Mapped[str] = mapped_column(String(20), default="id")    # "id" | "en" | "bilingual"
    preferred_citation_style: Mapped[str] = mapped_column(String(20), default="apa")
    preferred_ai_mode: Mapped[str] = mapped_column(String(30), default="instant")  # instant | thinking_standard | thinking_extended
    academic_level: Mapped[str] = mapped_column(String(30), default="undergraduate")  # undergraduate | postgraduate | researcher

    projects: Mapped[list] = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
