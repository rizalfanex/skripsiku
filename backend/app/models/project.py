from __future__ import annotations
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")

    # Project type and settings
    document_type: Mapped[str] = mapped_column(String(50), default="thesis")
    # thesis | journal_article | conference_paper | abstract | literature_review | other

    academic_field: Mapped[str] = mapped_column(String(100), default="")
    academic_level: Mapped[str] = mapped_column(String(30), default="undergraduate")
    # undergraduate | postgraduate | researcher

    language: Mapped[str] = mapped_column(String(20), default="id")
    citation_style: Mapped[str] = mapped_column(String(20), default="apa")
    ai_mode: Mapped[str] = mapped_column(String(30), default="instant")

    # Status
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | archived

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    conversations: Mapped[list] = relationship("Conversation", back_populates="project")
