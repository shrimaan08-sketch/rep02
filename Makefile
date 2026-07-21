.PHONY: up down build logs backend-shell db-shell test migrate revision seed clean

# --- Full stack ---
up:
	docker compose up --build

up-detached:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v

# --- Backend ---
backend-shell:
	docker compose exec backend /bin/sh

db-shell:
	docker compose exec postgres psql -U revion_user -d revion

test:
	docker compose exec backend pytest -v --cov=app --cov-report=term-missing

migrate:
	docker compose exec backend alembic upgrade head

revision:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

seed:
	docker compose exec backend python -m app.db.seed

# --- Local (non-docker) backend dev ---
backend-dev:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend-dev:
	cd frontend && npm run dev
