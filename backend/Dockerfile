FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# System deps: libpq for psycopg2, libjpeg/zlib for Pillow (barcode/QR images).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod +x scripts/entrypoint.sh && mkdir -p /app/storage/documents/codes

# Render sets and injects $PORT; default to 8000 for local runs. EXPOSE is
# documentation-only, so a static value is fine here.
EXPOSE 8000

# Healthcheck honors $PORT so it works whether the platform assigns 8000 or
# any other port. (On Render, platform-level health checks also apply.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -f "http://localhost:${PORT}/health" || exit 1

ENTRYPOINT ["scripts/entrypoint.sh"]
