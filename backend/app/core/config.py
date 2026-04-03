from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    # ── App ──────────────────────────────────────────────────
    app_name: str = "Skripsiku"
    app_env: str = "development"
    debug: bool = True

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",")]

    # ── Security ─────────────────────────────────────────────
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # ── Database ─────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./skripsiku.db"

    # ── NVIDIA API ───────────────────────────────────────────
    nvidia_api_key: str = Field(default="", description="NVIDIA hosted API key")
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1/chat/completions"
    nvidia_deployment_mode: str = "hosted"  # "hosted" | "self-hosted"

    # Self-hosted NIM endpoints (optional)
    nim_endpoint_instant: str = ""
    nim_endpoint_thinking: str = ""

    # ── Model Routing ────────────────────────────────────────
    model_instant: str = "moonshotai/kimi-k2-instruct-0905"
    model_thinking_standard: str = "moonshotai/kimi-k2-thinking"
    model_thinking_extended: str = "moonshotai/kimi-k2-thinking"

    # ── LLM Defaults ─────────────────────────────────────────
    llm_max_tokens_instant: int = 2048
    llm_max_tokens_thinking: int = 4096
    llm_max_tokens_extended: int = 8192

    llm_temperature_instant: float = 0.7
    llm_temperature_thinking: float = 0.3
    llm_temperature_extended: float = 0.2

    llm_max_retries: int = 3
    llm_retry_delay_seconds: float = 2.0


settings = Settings()
