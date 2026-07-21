"""Alembic migration environment.

Migrations run against a *synchronous* psycopg2 engine (not the app's async
asyncpg engine). This is deliberate: Alembic's machinery is synchronous, and
running migrations over a plain sync driver is simpler and more reliable
during container startup / CI than driving it through asyncio. The URL is
derived from the same DATABASE_URL the app uses, via settings.sync_database_url,
so there is only ever one source of truth for where the database is.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base
from app.models import *  # noqa: F401,F403  -- registers every model on Base.metadata

config = context.config
# Force the sync (psycopg2) URL regardless of what DATABASE_URL's scheme is.
config.set_main_option("sqlalchemy.url", settings.sync_database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without a live DB connection (alembic ... --sql)."""
    context.configure(
        url=settings.sync_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database using a sync engine."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
