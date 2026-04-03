from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def _sqlite_migrate(conn) -> None:
    """Migrate SQLite schema when model changes require it."""
    from sqlalchemy import text

    try:
        result = await conn.execute(text("PRAGMA table_info(conversations)"))
        cols = {row[1] for row in result.fetchall()}
    except Exception:
        return  # Table doesn't exist yet; create_all will create it

    if not cols:
        return  # Empty table listing; create_all will handle it

    # If new required columns are missing, recreate the conversations + messages tables.
    # This loses existing conversation data but is acceptable during development.
    needs_recreation = "title" not in cols or "user_id" not in cols

    if needs_recreation:
        logger.warning(
            "Conversations schema outdated — dropping tables for migration. "
            "Existing conversation data will be lost."
        )
        await conn.execute(text("PRAGMA foreign_keys = OFF"))
        await conn.execute(text("DROP TABLE IF EXISTS messages"))
        await conn.execute(text("DROP TABLE IF EXISTS conversations"))
        await conn.execute(text("PRAGMA foreign_keys = ON"))
        logger.info("Dropped conversations/messages tables. They will be recreated.")


async def init_db() -> None:
    """Create all tables on startup, running migrations if needed."""
    # Import models so SQLAlchemy can discover them
    from app.models import user, project, conversation  # noqa: F401

    async with engine.begin() as conn:
        if "sqlite" in str(engine.url):
            await _sqlite_migrate(conn)
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with AsyncSessionLocal() as session:
        yield session
