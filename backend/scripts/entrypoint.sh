#!/bin/sh
# Production-grade container entrypoint for the Revion backend.
#
#   1. Wait for the database to accept connections (managed Postgres on
#      Render can take a few seconds to be reachable on first deploy).
#   2. Run Alembic migrations to bring the schema to head. This is the
#      single source of truth for schema in every environment — there is no
#      dev-only create_all() fallback in the container path.
#   3. Optionally seed the initial admin + demo data (idempotent).
#   4. Exec uvicorn, binding to the platform-provided $PORT.
#
# Every step logs clearly and the script aborts on any failure (set -e) so a
# bad migration fails the deploy loudly instead of starting a broken app.
set -e

echo "==> Revion backend starting (env: ${ENVIRONMENT:-development})"

# ---- 1. Wait for Postgres ----
echo "==> Waiting for the database to become reachable..."
python <<'PYEOF'
import time
import psycopg2
from app.core.config import settings

# Use the sync (psycopg2) URL for the readiness probe.
dsn = settings.sync_database_url.replace("postgresql+psycopg2://", "postgresql://")
last_err = None
for attempt in range(1, 61):
    try:
        conn = psycopg2.connect(dsn, connect_timeout=3)
        conn.close()
        print(f"    Database reachable after {attempt} attempt(s).")
        break
    except Exception as exc:  # noqa: BLE001
        last_err = exc
        print(f"    [{attempt}/60] not ready yet: {exc}")
        time.sleep(2)
else:
    raise SystemExit(f"Database never became reachable: {last_err}")
PYEOF

# ---- 2. Run migrations ----
echo "==> Applying database migrations (alembic upgrade head)..."
alembic upgrade head

# ---- 3. Seed (idempotent; controlled by SEED_ON_STARTUP) ----
if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
  echo "==> Seeding initial data (idempotent)..."
  python -m app.db.seed
else
  echo "==> SEED_ON_STARTUP is false; skipping seed."
fi

# ---- 4. Launch the API server ----
PORT="${PORT:-8000}"
WORKERS="${UVICORN_WORKERS:-2}"
echo "==> Starting uvicorn on 0.0.0.0:${PORT} with ${WORKERS} worker(s)..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --workers "${WORKERS}" --proxy-headers --forwarded-allow-ips="*"
