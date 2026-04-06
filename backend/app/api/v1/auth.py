"""
Auth stub — no-auth local mode.

All requests are served by a single persistent local user that is
created automatically on first startup.  No login, no JWT, no sessions.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# The fixed ID used for the single local user.
LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_local_user(db: AsyncSession = Depends(get_db)) -> User:
    """Return the single local user (always exists after startup)."""
    result = await db.execute(select(User).where(User.id == LOCAL_USER_ID))
    return result.scalar_one()


# Keep get_current_user as an alias so other modules import it unchanged.
get_current_user = get_local_user


async def ensure_local_user(db: AsyncSession) -> User:
    """Create the local user if it doesn't exist yet (called at startup)."""
    result = await db.execute(select(User).where(User.id == LOCAL_USER_ID))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id=LOCAL_USER_ID,
            email="local@skripsiku.app",
            full_name="Pengguna Lokal",
            hashed_password="",
            is_active=True,
        )
        db.add(user)
        await db.commit()
    return user
