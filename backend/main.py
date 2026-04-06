"""
Skripsiku Backend — FastAPI Application Entry Point
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db, get_db

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Skripsiku API",
    description="AI Academic Writing Assistant — Backend API",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    logger.info("Initialising database…")
    await init_db()
    # Create the single local user (no-auth mode)
    from app.api.v1.auth import ensure_local_user  # noqa: PLC0415
    async for db in get_db():
        await ensure_local_user(db)
        break
    # Start file expiry cleanup background task
    from app.api.v1.files import start_cleanup_task  # noqa: PLC0415
    start_cleanup_task()
    logger.info("Skripsiku backend ready on port %d", settings.backend_port)


@app.get("/", include_in_schema=False)
async def root() -> JSONResponse:
    return JSONResponse({"service": "skripsiku-api", "version": "1.0.0", "docs": "/docs", "health": "/health"})


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "service": "skripsiku-api", "version": "1.0.0"}
