"""
Centralized application configuration (12-factor).

All runtime configuration is sourced from environment variables. The design
goal is that the exact same image runs locally (docker-compose) and on
Render with zero code changes — only environment variables differ.

Key production concern handled here: Render (and most managed Postgres
providers) inject a single ``DATABASE_URL`` in the libpq form
``postgresql://user:pass@host:5432/db``. This application uses the async
SQLAlchemy driver (asyncpg) at runtime and a sync driver (psycopg2) for
Alembic migrations. Rather than force the operator to know that, we accept
whatever ``DATABASE_URL`` is provided and derive both driver-specific URLs
from it automatically (see ``async_database_url`` / ``sync_database_url``).
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _strip_driver(url: str) -> str:
    """Return the bare libpq URL with any SQLAlchemy driver suffix removed.

    Handles every scheme a provider might hand us and reduces it to a plain
    ``postgresql://...`` so we can re-attach exactly the driver we want:

        postgresql+asyncpg://...   -> postgresql://...
        postgresql+psycopg2://...  -> postgresql://...
        postgresql+anything://...  -> postgresql://...
        postgres://...             -> postgresql://...   (legacy scheme)
        postgresql://...           -> postgresql://...   (unchanged)
    """
    url = (url or "").strip()
    # Normalize the legacy short scheme first.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    # Strip ANY "+driver" between the scheme and "://", not just known ones.
    if url.startswith("postgresql+"):
        idx = url.find("://")
        if idx != -1:
            url = "postgresql" + url[idx:]
    return url


def _with_driver(url: str, driver: str) -> str:
    """Force a specific SQLAlchemy driver onto a Postgres URL.

    ``driver`` is e.g. "asyncpg" or "psycopg2". The input may carry any (or
    no) driver; the output always uses exactly the requested one.
    """
    bare = _strip_driver(url)
    # bare is guaranteed to start with "postgresql://"
    return f"postgresql+{driver}://" + bare[len("postgresql://"):]


def _strip_sslmode(url: str) -> str:
    """Remove a ``sslmode`` query parameter from a URL.

    asyncpg does not accept ``sslmode`` (a libpq/psycopg2 concept) and raises
    if it's present. Removing it lets asyncpg negotiate SSL on its own. Only
    applied to the async URL; the sync (psycopg2) URL keeps sslmode.
    """
    if "sslmode=" not in url:
        return url
    base, _, query = url.partition("?")
    if not query:
        return url
    kept = [p for p in query.split("&") if p and not p.startswith("sslmode=")]
    return base + ("?" + "&".join(kept) if kept else "")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # --- Core ---
    PROJECT_NAME: str = "Revion"
    ENVIRONMENT: str = "development"  # development | staging | production
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    # Port the ASGI server binds to. Render injects PORT automatically; the
    # entrypoint reads this so we never hardcode 8000 in production.
    PORT: int = 8000

    # --- Security ---
    # No usable default in production: if SECRET_KEY is unset AND the
    # environment is production, startup fails loudly (see _validate_prod).
    SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- Database ---
    # Preferred: a single DATABASE_URL (what Render/Heroku/Neon/Supabase give
    # you). If it's absent, we fall back to assembling one from discrete
    # POSTGRES_* vars, which is convenient for local docker-compose.
    DATABASE_URL: str | None = None
    POSTGRES_USER: str = "revion_user"
    POSTGRES_PASSWORD: str = "revion_password"
    POSTGRES_SERVER: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "revion"

    @model_validator(mode="after")
    def _assemble_database_url(self):
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self

    @property
    def async_database_url(self) -> str:
        """asyncpg URL for the running application's async engine.

        Always ``postgresql+asyncpg://`` regardless of the driver (or absence
        of one) in DATABASE_URL. This is the guard against the
        "asyncio extension requires an async driver" error that occurs when a
        bare ``postgresql://`` URL is passed to create_async_engine (SQLAlchemy
        would otherwise default that to the sync psycopg2 DBAPI).

        Also strips the libpq-only ``sslmode`` query param, which psycopg2
        understands but asyncpg does not (asyncpg would raise
        "unexpected keyword argument 'sslmode'"). Render's *internal* database
        URL has no sslmode, so this only matters if you point the app at an
        external URL.
        """
        url = _with_driver(self.DATABASE_URL, "asyncpg")
        return _strip_sslmode(url)

    @property
    def sync_database_url(self) -> str:
        """psycopg2 URL for Alembic migrations and the DB readiness probe.

        Always ``postgresql+psycopg2://`` regardless of DATABASE_URL's driver.
        ``sslmode`` is preserved here because psycopg2 honors it.
        """
        return _with_driver(self.DATABASE_URL, "psycopg2")

    # --- Redis ---
    # Optional in production. If unset, rate limiting and dashboard caching
    # degrade gracefully (fail-open) rather than erroring — see core/redis.py.
    REDIS_URL: str | None = None

    # --- CORS ---
    # Comma-separated list OR JSON array of allowed origins. In production
    # this MUST include your deployed frontend URL, e.g.
    # "https://revion-web.onrender.com".
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v):
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                # Leave JSON-array form for pydantic's own JSON parsing.
                return v
            return [origin.strip() for origin in s.split(",") if origin.strip()]
        return v

    # --- Email (SMTP) ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "no-reply@revion.app"
    SMTP_TLS: bool = True
    EMAIL_ENABLED: bool = False  # flip on once SMTP creds are configured

    # --- AI (Anthropic) ---
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # --- File storage ---
    UPLOAD_DIR: str = "/app/storage/documents"
    MAX_UPLOAD_SIZE_MB: int = 25

    # --- Startup behavior ---
    # When true, the entrypoint seeds the admin + demo dataset after
    # migrations. Idempotent, so safe to leave on; set false in production
    # once you've created real accounts.
    SEED_ON_STARTUP: bool = True

    # --- Pagination ---
    DEFAULT_PAGE_SIZE: int = 25
    MAX_PAGE_SIZE: int = 200

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

    @property
    def redis_enabled(self) -> bool:
        return bool(self.REDIS_URL)

    @model_validator(mode="after")
    def _validate_prod(self):
        """Fail fast on insecure/incomplete production configuration."""
        if self.is_production:
            problems = []
            insecure_defaults = (
                "",
                "dev-only-insecure-secret-change-me",
                "change-me-in-production-please-use-a-long-random-string",
            )
            if self.SECRET_KEY in insecure_defaults:
                problems.append("SECRET_KEY must be set to a strong random value in production.")
            elif len(self.SECRET_KEY) < 32:
                problems.append("SECRET_KEY must be at least 32 characters in production.")
            if not self.DATABASE_URL:
                problems.append("DATABASE_URL must be set in production.")
            if problems:
                raise ValueError("Invalid production configuration:\n  - " + "\n  - ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
