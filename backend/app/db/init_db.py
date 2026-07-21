"""
DEV-ONLY convenience bootstrap (NOT used in the container/deploy path).

For quick local experimentation without running Alembic, this creates the
schema directly from SQLAlchemy metadata and then seeds data. Production and
Docker both use migrations instead: the container entrypoint runs
`alembic upgrade head` followed by `python -m app.db.seed`.

Prefer `alembic upgrade head` + `python -m app.db.seed` even locally; this
file exists only as a zero-dependency escape hatch.
"""
import asyncio
import logging

from app.db.base import Base
from app.db.session import engine
from app.db.seed import main as seed_main
from app.models import *  # noqa: F401,F403

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("revion.init_db")


async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured (dev-only create_all path).")


async def main() -> None:
    await create_tables()
    await seed_main()


if __name__ == "__main__":
    asyncio.run(main())
