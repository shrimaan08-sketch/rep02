# Revion — Engineering Change Management

A production-grade Engineering Change Order (ECO) management system for manufacturing
organizations: parts and BOMs, engineering change requests (ECRs), engineering change
orders (ECOs), role-based signed approval workflows, revision history, document
versioning, impact analysis, supplier notifications, audit logging, barcode/QR
generation, dashboards, search, reporting, email notifications, and AI-generated
change summaries.

**Stack:** Next.js 14 (TypeScript, Tailwind) · FastAPI · PostgreSQL · Redis · Docker

---

## 1. Project structure

```
revion/
├── docker-compose.yml           # Full-stack orchestration (postgres, redis, backend, frontend)
├── Makefile                     # `make up`, `make test`, `make migrate`, etc.
├── .env.example                 # Root compose variables
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, middleware, exception handlers, /health
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings (env-driven)
│   │   │   ├── security.py      # JWT, password hashing, RBAC dependencies
│   │   │   └── redis.py         # Async Redis client, cache helpers, rate-limit counter
│   │   ├── db/
│   │   │   ├── base.py          # Declarative base + timestamp mixin
│   │   │   ├── session.py       # Async engine/session factory
│   │   │   └── init_db.py       # Dev bootstrap: create tables, seed admin + demo data
│   │   ├── models/               # SQLAlchemy ORM models (one file per aggregate)
│   │   │   ├── user.py           # User, UserRole
│   │   │   ├── part.py           # Part, PartRevision, BOM, BOMItem
│   │   │   ├── ecr.py            # ECR (change request)
│   │   │   ├── eco.py            # ECO, ECOAffectedPart
│   │   │   ├── approval.py       # ApprovalStep (signed approval chain)
│   │   │   ├── document.py       # Document, Supplier, SupplierNotification
│   │   │   └── audit.py          # AuditLog (append-only)
│   │   ├── schemas/               # Pydantic request/response models
│   │   ├── services/              # Business logic — the core of the app
│   │   │   ├── ecr_service.py         # ECR lifecycle + transitions
│   │   │   ├── eco_service.py         # ECO lifecycle, orchestrates the rest
│   │   │   ├── approval_service.py    # Approval-chain templates, signing, advancement
│   │   │   ├── impact_analysis_service.py  # BOM graph traversal
│   │   │   ├── part_service.py / bom_service.py
│   │   │   ├── document_service.py    # Versioned uploads, checksums
│   │   │   ├── supplier_service.py    # Supplier notifications
│   │   │   ├── notification_service.py # SMTP email (or logs, if disabled)
│   │   │   ├── barcode_service.py     # QR / Code128 generation
│   │   │   ├── ai_service.py          # Anthropic-powered change summaries
│   │   │   ├── numbering_service.py   # ECR-2026-000123 / ECO-2026-000045
│   │   │   ├── search_service.py      # Cross-entity search
│   │   │   ├── report_service.py      # Dashboard metrics, CSV/PDF export
│   │   │   └── audit_service.py       # Single write-path for the audit trail
│   │   ├── api/v1/endpoints/      # FastAPI routers — thin, delegate to services
│   │   └── tests/                 # pytest + pytest-asyncio, SQLite in-memory
│   ├── alembic/                   # Migration environment (see §6 — Limitations)
│   ├── scripts/entrypoint.sh      # Wait-for-postgres → bootstrap DB → run uvicorn
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/                   # Next.js App Router pages
    │   │   ├── login/, dashboard/, parts/, ecrs/, ecos/, suppliers/, audit-log/, search/
    │   ├── components/            # AppShell (nav shell), StatusBadge, ui.tsx (primitives)
    │   ├── lib/                   # api.ts (axios + refresh), auth.tsx, swr.ts, format.ts
    │   └── types/                 # Shared TypeScript types mirroring backend schemas
    ├── Dockerfile                  # Multi-stage build, standalone output
    ├── package.json
    └── tailwind.config.js          # Custom "industrial blueprint" design tokens
```

---

## 2. Implemented features

- **Auth & RBAC** — JWT access/refresh tokens, 7 roles (admin, engineer, quality,
  manufacturing, procurement, approver, viewer), per-route role gating, plus
  ownership checks (only a record's author or an admin can edit its draft).
- **Parts & revisions** — part master, immutable revision history, release workflow.
- **BOMs** — multi-level bills of materials with reference designators, find numbers,
  per-line quantities.
- **ECRs** — change requests with reason codes, priority, and an enforced status
  state machine (draft → submitted → under_review → approved/rejected → converted).
- **ECOs** — change orders with a similar enforced lifecycle (draft → pending_approval
  → in_review → approved/rejected → implemented → closed), classified as
  minor/major/emergency, each mapping to a different approval-chain template.
- **Signed approval workflow** — sequential + parallel approval steps by role;
  approving requires re-entering your password as an explicit e-signature action;
  a SHA-256 hash of the signing payload is stored as tamper-evidence; rejection
  halts the chain.
- **Impact analysis** — BOM graph traversal to surface every upstream assembly
  that transitively consumes a changed part.
- **Document versioning** — checksummed, versioned uploads grouped by a stable
  `document_group` id.
- **Supplier notifications** — track sent/acknowledged/failed status per supplier
  per ECO, with real SMTP email (or logged output if SMTP isn't configured).
- **Audit log** — a single write path (`audit_service.record`) used by every
  mutating service call; append-only; visible to admin/quality roles.
- **Barcode / QR generation** — Code128 + QR codes generated per ECO for
  shop-floor travelers.
- **AI-generated summaries** — Anthropic API call on ECR/ECO creation, producing
  a plain-English summary for non-engineering stakeholders. Fails soft (no key
  configured → simply no summary, nothing breaks).
- **Dashboards** — live counts by status, open ECOs, average cycle time; Redis-cached
  with graceful fallback if Redis is down.
- **Search** — cross-entity search across parts/ECRs/ECOs.
- **Reporting** — CSV and PDF export of the ECO register.
- **REST API** — fully documented via FastAPI's generated OpenAPI/Swagger UI.
- **Docker deployment** — full docker-compose stack with health checks.

---

## 3. Known limitations & assumptions

Read this section before treating anything below as "already verified" —
these are the honest boundaries of what's been validated in this environment.

**Environment constraints (could not run the app end-to-end):**
- This project was built in a sandboxed environment with no outbound network
  access, so `pip install` / `npm install` could not be completed, and the app
  has **not been executed** — not started, not hit with a live HTTP request, not
  connected to a real Postgres/Redis instance.
- Compensating static checks performed instead:
  - Every backend `.py` file passes `python -m py_compile` (syntax-valid).
  - Every frontend `.ts`/`.tsx` file passes a `tsc --noEmit` parse check with zero
    genuine syntax/type errors — the ~150 reported errors are 100% "module not
    found" cascades from the absent `node_modules`, individually confirmed by
    category (TS2307/TS2875/TS2503/TS2591/TS2882 are all missing-type-declaration
    errors; the 2 TS2339 hits are a known false positive from `axios.isAxiosError`
    losing its type-guard narrowing without axios's own types installed).
  - A manual review pass specifically hunted for async-SQLAlchemy lazy-load
    traps (a real, subtle bug class where an ORM relationship accessed during
    Pydantic serialization crashes if not eagerly loaded) — found and fixed
    several instances; see the fix list in the accompanying PR/commit notes.
- **You must run the manual verification checklist in §5 after `docker compose up`.**
  Static analysis can catch classes of bug (syntax errors, unloaded relationships,
  missing imports) but cannot catch everything a live request would surface
  (e.g., an actual Alembic migration run, real SMTP delivery, real Anthropic API
  responses, real concurrent-request behavior).

**Design assumptions:**
- **Migrations are the source of truth for schema.** The container entrypoint
  runs `alembic upgrade head` on every startup (both locally and on Render);
  there is a complete hand-authored initial migration at
  `backend/alembic/versions/0001_initial_schema.py` covering all 13 tables,
  enums, indexes, and constraints. The dev-only `app/db/init_db.py`
  (`create_all()`) is **not** used in the container/deploy path — it's just a
  zero-dependency local escape hatch. When you change a model, generate a new
  migration with `alembic revision --autogenerate -m "describe change"` (the
  Makefile has a `revision` target) and commit it; it ships automatically on
  the next deploy.
- **Seed credentials default to the demo values but are override-able.**
  `admin@revion.app` / `ChangeMe123!` seed on first boot. In production, set
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and `SEED_DEMO_ACCOUNTS=false` so
  only your real admin is created. Rotate any default immediately.
- **Approval role gating is broad, not per-transition.** Any user holding a role
  named in the ECO's `eco_class` template can act on the currently-active step;
  the system does not additionally check that they're on a specific "approved
  list" beyond their role. This is an intentional MVP simplification.
- **Suppliers don't have their own login** — a supplier "acknowledgement" is
  recorded by an internal user (procurement/engineer) on the supplier's behalf,
  not via a supplier-facing portal.
- **No real-time push** — the frontend polls (SWR `refreshInterval` on the
  dashboard) rather than using websockets; approval status updates require a
  manual refresh or re-navigation elsewhere.
- **Mobile responsiveness is partial.** Page content reflows reasonably (grid
  breakpoints throughout), but the sidebar nav is a fixed-width desktop pattern
  with no collapsible mobile drawer. Treat this as a desktop-first enterprise
  tool for now — see Future Enhancements.
- **`current_revision_id` is intentionally not a database foreign key** —
  `Part.current_revision_id` is a plain integer column rather than a formal FK,
  specifically so the schema creates cleanly on SQLite (used by the test suite)
  as well as Postgres, avoiding a circular FK dependency between `Part` and
  `PartRevision`. Referential integrity for that pointer is enforced in
  `part_service`, not the database.

---

## 4. Setup & deployment

### Quick start (Docker — recommended)

```bash
git clone <this repo> && cd revion
cp .env.example .env
cp backend/.env.example backend/.env
# Edit backend/.env: set a real SECRET_KEY, and optionally SMTP_* / ANTHROPIC_API_KEY

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger UI): http://localhost:8000/api/v1/docs
- Backend health check: http://localhost:8000/health

On first boot the backend waits for Postgres, runs Alembic migrations
(`alembic upgrade head`), then seeds:
- Admin: `admin@revion.app` / `ChangeMe123!`
- Demo role accounts (`engineer@`, `quality@`, `mfg@`, `procurement@`,
  `management@revion.app`, same password)
- A small demo parts catalog + BOM + one supplier

**Rotate every seeded password before using this anywhere but a local machine.**

### Deploying to Render (managed PostgreSQL)

This repo is Render-ready and ships a `render.yaml` Blueprint. There are no
localhost assumptions and no code changes required after cloning — the backend
reads a standard `DATABASE_URL` and normalizes it to the async (asyncpg) and
sync (psycopg2) drivers itself, and migrations run automatically on startup.

**Option A — Blueprint (one step, provisions everything):**

1. Push this repo to GitHub.
2. In Render: **New ▸ Blueprint**, select the repo. Render reads `render.yaml`
   and creates: a managed PostgreSQL database (`revion-db`), the backend web
   service (`revion-api`, Docker), and the frontend web service (`revion-web`,
   Docker). `DATABASE_URL` is wired into the backend automatically and
   `SECRET_KEY` is generated for you.
3. Set the two cross-service URLs (Render can't infer full URLs with scheme +
   path in a Blueprint, so these are marked "sync: false" and prompt you):
   - On **revion-api** → `BACKEND_CORS_ORIGINS` = your frontend URL, e.g.
     `https://revion-web.onrender.com`
   - On **revion-web** → `NEXT_PUBLIC_API_URL` = your backend URL + `/api/v1`,
     e.g. `https://revion-api.onrender.com/api/v1`
   - (Optional) `SEED_ADMIN_PASSWORD` on the backend to avoid the demo default.
4. Trigger a redeploy of **revion-web** after setting `NEXT_PUBLIC_API_URL`
   (it's baked in at build time, so it must be present for the build).

That's it — the backend migrates + seeds on boot, and `/health` reports ready.

**Option B — manual services (if you prefer clicking):**

1. **Create the database:** New ▸ PostgreSQL. Copy its *Internal Database URL*.
2. **Backend:** New ▸ Web Service ▸ from repo, Root Directory `backend`,
   Runtime **Docker**, Health Check Path `/health`. Add the env vars from the
   table below (paste the Internal Database URL as `DATABASE_URL`).
3. **Frontend:** New ▸ Web Service ▸ from repo, Root Directory `frontend`,
   Runtime **Docker**. Set `NEXT_PUBLIC_API_URL` to the backend's URL + `/api/v1`.

#### Render environment variables — what to set and why

**Backend service (`revion-api`):**

| Variable | Required | Set to / example | What it does |
|---|---|---|---|
| `DATABASE_URL` | ✅ | *(from managed DB)* | Postgres connection string. Blueprint wires it automatically; manually, paste the DB's Internal Database URL. Plain `postgresql://` is fine — the app derives async/sync drivers. |
| `SECRET_KEY` | ✅ | *(generate, ≥32 chars)* | Signs JWTs. Blueprint auto-generates. Manually: `openssl rand -hex 32`. App refuses to boot in prod if weak/short. |
| `ENVIRONMENT` | ✅ | `production` | Enables prod validation (rejects insecure config). |
| `BACKEND_CORS_ORIGINS` | ✅ | `https://revion-web.onrender.com` | Comma-separated allowed browser origins. Must include the frontend URL or the browser blocks API calls. |
| `PORT` | auto | *(injected by Render)* | Port the server binds to. Do **not** set manually on Render. |
| `SEED_ON_STARTUP` | ⬜ | `true` | Seed an admin after migrations (idempotent). |
| `SEED_ADMIN_EMAIL` | ⬜ | `admin@revion.app` | Email of the seeded admin. |
| `SEED_ADMIN_PASSWORD` | ⬜ | *(a strong password)* | Password for the seeded admin. Set this so prod doesn't use the demo default. |
| `SEED_DEMO_ACCOUNTS` | ⬜ | `false` | Whether to also seed 5 demo users + demo parts. `false` = admin only. |
| `REDIS_URL` | ⬜ | *(Redis internal URL)* | Enables rate-limiting + dashboard caching. Omit to run without Redis (fails open). |
| `ANTHROPIC_API_KEY` | ⬜ | *(your key)* | Enables AI change summaries. Omit to disable silently. |
| `EMAIL_ENABLED` + `SMTP_*` | ⬜ | *(SMTP creds)* | Real email delivery for notifications. Omit to log emails instead. |
| `UVICORN_WORKERS` | ⬜ | `2` | Number of worker processes. |

**Frontend service (`revion-web`):**

| Variable | Required | Set to / example | What it does |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://revion-api.onrender.com/api/v1` | Base URL the browser calls. **Baked in at build time** — set it before/at build and redeploy if you change it. Include `/api/v1`. |
| `NEXT_PUBLIC_DEMO_MODE` | ⬜ | `false` | Leave false to use the real backend. |

**Notes:**
- **Migrations run automatically** on every backend deploy via the container
  entrypoint (`alembic upgrade head`), so schema changes ship with your code —
  no manual migration step.
- **Uploads/QR images** write to the container's ephemeral filesystem, which
  resets on redeploy. Attach a **Render Disk** mounted at `/app/storage` if you
  need documents to persist.
- **Free plan** services sleep when idle and cold-start on the next request;
  bump to a paid plan for always-on.

### Local development (without Docker)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # point POSTGRES_SERVER/REDIS_URL at local instances
python -m app.db.init_db   # create schema + seed data
uvicorn app.main:app --reload --port 8000

# Frontend (separate shell)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Running tests

```bash
docker compose exec backend pytest -v --cov=app --cov-report=term-missing
# or, without Docker:
cd backend && pip install -r requirements.txt && pytest -v
```

Tests use an in-memory SQLite database (see `app/tests/conftest.py`) so they run
without a live Postgres instance, exercising the same async ORM code paths.

### Environment variables of note

| Variable | Where | Purpose |
|---|---|---|
| `SECRET_KEY` | backend/.env | JWT signing key — **must** be changed for anything beyond local dev |
| `EMAIL_ENABLED` + `SMTP_*` | backend/.env | Real email delivery; if `false`, emails are logged instead of sent |
| `ANTHROPIC_API_KEY` | backend/.env | Enables AI-generated ECR/ECO summaries; blank = feature silently disabled |
| `NEXT_PUBLIC_API_URL` | frontend build arg (docker-compose.yml `build.args`) | **Build-time**, not runtime — Next.js inlines this into the client bundle. Changing it requires rebuilding the frontend image. |

---

## 5. Manual verification checklist

Run through this after `docker compose up`, before considering the system
production-ready. Each item exercises a path that static analysis cannot fully
confirm.

**Auth & RBAC**
- [ ] Log in as `admin@revion.app`; confirm `/auth/me` returns the right role.
- [ ] Log in as `engineer@revion.app`; confirm you can create parts/ECRs/ECOs,
      but a `viewer@` account cannot.
- [ ] Trigger 11 rapid failed logins from one IP; confirm the 11th returns 429.
- [ ] Let an access token expire (or edit `ACCESS_TOKEN_EXPIRE_MINUTES` down);
      confirm the frontend silently refreshes via the interceptor rather than
      logging you out.

**Parts & BOMs**
- [ ] Create a part; confirm it gets an initial "Rev A" automatically.
- [ ] Build a 3-level BOM (bracket → subassembly → final assembly) and confirm
      the BOM viewer shows nested items with correct quantities.

**ECR → ECO lifecycle**
- [ ] Create an ECR as `engineer@`; submit it; move it through
      submitted → under_review → approved as `quality@` or `admin@`.
- [ ] Convert the approved ECR into an ECO; confirm the ECR flips to `converted`.
- [ ] Submit the ECO; confirm an approval chain is generated matching its
      `eco_class` (minor/major/emergency have different chains — check
      `approval_service.APPROVAL_TEMPLATES`).
- [ ] Sign each approval step as the matching role, re-entering that user's
      password in the signature modal; confirm a wrong password is rejected
      and a wrong role is rejected (403).
- [ ] Reject one step on a separate ECO and confirm the whole ECO flips to
      `rejected` and the chain halts.
- [ ] Fully approve an ECO; mark it implemented; confirm affected parts'
      `current_revision_id` updates and their status returns to `active`.
- [ ] Close the ECO.

**Impact analysis**
- [ ] On the seeded demo BOM (bracket → subassembly → final assembly), link the
      bracket part to a new ECO and confirm impact analysis reports both the
      subassembly and final assembly as "upstream assemblies."

**Documents, suppliers, barcodes**
- [ ] Upload a document to an ECO; upload a second version with the same
      `document_group`; confirm version numbers increment and both are listed.
- [ ] Add a supplier; notify them on an ECO; confirm an email is logged (or sent,
      if SMTP is configured) and status flips to `sent`.
- [ ] Open `/api/v1/ecos/{id}/qr-code` directly in a browser; confirm a QR image
      renders and decodes to `ECO:<number>`.

**Reporting & search**
- [ ] Hit `/api/v1/reports/eco-register.csv` and `.pdf`; confirm both download
      and contain the ECOs you created.
- [ ] Use the global search bar for a part number, an ECR number, and an ECO
      number; confirm all three surface correct results.
- [ ] Watch the dashboard for 30+ seconds; confirm metrics refresh without a
      full page reload.

**Resilience**
- [ ] Stop the `redis` container; confirm login and the dashboard still work
      (degraded, but not broken) per the fail-open logic added in this review.
- [ ] Restart `redis`; confirm rate limiting and caching resume normally.

**AI summaries (optional — requires a real `ANTHROPIC_API_KEY`)**
- [ ] Set a real key, restart the backend, create a new ECR; confirm
      `ai_summary` is populated and displayed in the UI.
- [ ] Remove the key; confirm ECR/ECO creation still succeeds with no summary
      and no error.

---

## 6. Future enhancements (prioritized)

1. **Autogenerate future migrations against a live DB.** The initial migration
   is hand-authored and complete; subsequent schema changes should use
   `alembic revision --autogenerate` (Makefile `revision` target) run against a
   real Postgres so Alembic diffs precisely.
2. **Per-transition RBAC on approval steps** — right now any holder of the
   required role can act; a stricter version would support explicitly assigned
   approvers per step (the schema already has `approver_id`, just not enforced
   at assignment time).
3. **Mobile-responsive navigation drawer** for the sidebar, replacing the
   fixed-width desktop-only pattern.
4. **Real-time updates** (WebSocket or SSE) for approval status changes, instead
   of polling/manual refresh.
5. **Supplier-facing portal** with its own auth, so suppliers acknowledge
   notifications directly instead of via an internal user proxy.
6. **Full-text search** (Postgres `tsvector` or an external index) to replace
   the current `ILIKE`-based search once catalogs grow beyond tens of thousands
   of rows.
7. **E2E test suite** (Playwright/Cypress) covering the full ECR→ECO→approval→
   close flow through the actual UI, complementing the existing service-layer
   pytest suite.
8. **Configurable approval templates** — `APPROVAL_TEMPLATES` is currently a
   hardcoded dict; a real deployment would likely want these editable per
   organization without a code change.
9. **Rate limiting beyond login** (e.g., on ECO/document creation) to protect
   against abuse.
10. **Structured logging + APM integration** (e.g., OpenTelemetry) for
    production observability beyond the current `logging` module usage.
