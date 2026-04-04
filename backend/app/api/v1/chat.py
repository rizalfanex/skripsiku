"""
Chat API — main AI interaction endpoint.

Supports streaming via Server-Sent Events (SSE).
The orchestrator handles multi-model routing transparently.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user
from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.models.project import Project
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm.orchestrator import orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


async def _resolve_user_from_request(request: Request, db: AsyncSession) -> Optional[User]:
    """Try to extract user from Bearer token; return None if absent/invalid."""
    from fastapi.security.utils import get_authorization_scheme_param  # noqa: PLC0415
    from app.core.security import decode_token  # noqa: PLC0415
    from sqlalchemy import select as sa_select  # noqa: PLC0415

    auth_header = request.headers.get("authorization", "")
    scheme, token = get_authorization_scheme_param(auth_header)
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(sa_select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    except Exception:
        return None


def _make_title(first_user_message: str) -> str:
    """Derive a short display title from the first user message."""
    clean = first_user_message.strip()
    # Strip task-type prefix like "[Tulis Ulang]\n\n..."
    if clean.startswith("[") and "]\n" in clean:
        clean = clean.split("]\n", 1)[-1].strip()
    if len(clean) > 60:
        parts = clean[:57].rsplit(" ", 1)
        clean = (parts[0] if len(parts) > 1 else clean[:57]) + "..."
    return clean or "Chat Baru"


@router.post("/stream")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Stream AI responses as Server-Sent Events.

    Works in guest mode (no auth) or authenticated mode.
    Events: meta | start | chunk | step_complete | complete | error
    """
    current_user = await _resolve_user_from_request(request, db)

    # Validate project ownership only when project_id is explicitly provided
    if body.project_id and current_user:
        result = await db.execute(
            select(Project).where(
                Project.id == body.project_id,
                Project.owner_id == current_user.id,
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Project not found")

    # Persist only when authenticated
    conversation: Optional[Conversation] = None
    is_new_conversation = False
    user_message_content = body.messages[-1].content if body.messages else ""

    if current_user:
        conversation, is_new_conversation = await _get_or_create_conversation(db, body, current_user.id)
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=user_message_content,
        )
        db.add(user_msg)
        conversation.updated_at = datetime.now(timezone.utc)
        await db.commit()

    messages_dicts = [m.model_dump() for m in body.messages]

    async def event_generator():
        full_content = ""
        full_thinking = ""
        complete_event: str | None = None

        # Send conversation_id immediately so the frontend can track/navigate
        if conversation:
            yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation.id})}\n\n"

        try:
            async for chunk in orchestrator.stream(
                messages=messages_dicts,
                mode=body.mode,
                task_type=body.task_type,
                language=body.language,
                citation_style=body.citation_style,
                document_type=body.document_type,
                academic_field=body.academic_field,
                academic_level=body.academic_level,
            ):
                try:
                    event = json.loads(chunk.replace("data: ", "").strip())
                    if event.get("type") == "chunk":
                        full_content += event.get("content", "")
                    elif event.get("type") == "thinking_chunk":
                        full_thinking += event.get("content", "")
                    if event.get("type") == "complete":
                        complete_event = chunk
                        continue
                except Exception:
                    pass
                yield chunk

            # Save to DB BEFORE yielding complete so history is available immediately on navigation
            if full_content and current_user and conversation:
                try:
                    assistant_msg = Message(
                        conversation_id=conversation.id,
                        role="assistant",
                        content=full_content,
                        mode_used=body.mode,
                        task_type=body.task_type,
                    )
                    db.add(assistant_msg)
                    if is_new_conversation and not conversation.title:
                        conversation.title = _make_title(user_message_content)
                    conversation.updated_at = datetime.now(timezone.utc)
                    await db.commit()
                except Exception as exc:
                    logger.error("Failed to persist assistant message: %s", exc)
                    await db.rollback()

            # Now signal the frontend that everything is done and persisted
            if complete_event:
                yield complete_event

        except Exception as exc:
            logger.exception("Stream error: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_create_conversation(
    db: AsyncSession,
    body: ChatRequest,
    user_id: str,
) -> tuple[Conversation, bool]:
    """Return (conversation, is_new). Verifies user ownership on existing conversations."""
    if body.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == body.conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv, False

    conv = Conversation(
        user_id=user_id,
        project_id=body.project_id or None,
        mode=body.mode,
        task_type=body.task_type,
        language=body.language,
        citation_style=body.citation_style,
    )
    db.add(conv)
    await db.flush()
    return conv, True
