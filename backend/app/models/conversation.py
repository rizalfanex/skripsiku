from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Direct user ownership (allows conversations without a project)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # Optional project tag
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)

    # AI-generated title
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Session metadata
    mode: Mapped[str] = mapped_column(String(30), default="instant")
    task_type: Mapped[str] = mapped_column(String(50), default="general")
    language: Mapped[str] = mapped_column(String(20), default="id")
    citation_style: Mapped[str] = mapped_column(String(20), default="apa")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=_utcnow)

    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="conversations")
    messages: Mapped[list] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    role: Mapped[str] = mapped_column(String(20), nullable=False)   # "user" | "assistant" | "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Metadata for assistant messages
    model_used: Mapped[str] = mapped_column(String(100), default="")
    mode_used: Mapped[str] = mapped_column(String(30), default="")
    task_type: Mapped[str] = mapped_column(String(50), default="")
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
