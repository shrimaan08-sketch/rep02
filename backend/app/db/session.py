from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# The async engine MUST use an async driver (asyncpg). settings.async_database_url
# guarantees this, but we assert it explicitly so any future regression fails
# loudly here — with a clear message — instead of surfacing as SQLAlchemy's
# opaque "asyncio extension requires an async driver / loaded 'psycopg2' is not
# async" error deep in engine initialization.
_async_url = settings.async_database_url
assert _async_url.startswith("postgresql+asyncpg://"), (
    f"Async engine requires an asyncpg URL, got: {_async_url!r}. "
    "Check settings.async_database_url / DATABASE_URL."
)

engine = create_async_engine(
    _async_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
