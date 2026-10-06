# Phase 5C Pre-Migration Audit Report

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — PostgreSQL Migration & Public Deployment Readiness (Vercel / Render / Neon)  
**Date**: October 6, 2026  

---

## 1. Executive Summary

This audit establishes the baseline technical state prior to migrating the operational database layer from local SQLite (`data/dashboard.db`) to PostgreSQL (Neon) and configuring independent hosting (Frontend on Vercel, Backend on Render).

**Frozen Research Contract Status**: All Phase 4 artifacts (`models/isolation_forest_v1.pkl`, `models/model_metadata.json`, canonical datasets, temporal features, rule thresholds, ground-truth evaluation datasets) remain **100% frozen and untouched**.

---

## 2. Pre-Migration Codebase Audit

### 2.1 Database Access Layer (`src/dashboard/db.py`)
- **Current DB engine**: SQLite via Python built-in `sqlite3` module.
- **Connection model**: Ad-hoc connection creation per call (`sqlite3.connect(DB_PATH)`).
- **SQLite-Specific constructs**:
  - `sqlite3.Row` row factory.
  - `AUTOINCREMENT` primary keys for `evidence`, `reviews`, `audit_log`.
  - `WHERE 1=1` string queries with `?` parameter placeholders.
  - Custom `CASE risk_tier WHEN ...` SQL sorting.
- **Migration Target**: Refactor to SQLAlchemy 2.x ORM / Core abstraction supporting both PostgreSQL (via `psycopg` 3) and SQLite (for local test fallbacks).

### 2.2 API Layer (`src/dashboard/routes.py`)
- **Endpoints**:
  - `GET /api/health` — System health check (API, DB, Model status).
  - `GET /api/dashboard/summary` — Aggregate overview statistics.
  - `GET /api/anomalies` — Paginated anomaly queue with filtering & search.
  - `GET /api/anomalies/{id}` — Single anomaly record details.
  - `GET /api/anomalies/{id}/evidence` — Evidence breakdown & 13 temporal features.
  - `GET /api/anomalies/{id}/history` — Review & audit trail history.
  - `PATCH /api/anomalies/{id}/review` — Status decision transition (`UNREVIEWED` -> `VALIDATED`, etc.).
  - `GET /api/students/{id}/attendance-context` — Longitudinal student timeline.
  - `GET /api/reports/compliance-preview` — Institutional audit report summary.
  - `GET /api/system/info` — Technical provenance & model lineage.
- **Known Issue identified**: `GET /api/anomalies/SYSTEM/history` currently calls `get_anomaly_detail("SYSTEM")` first. If `'SYSTEM'` does not exist as an anomaly record, it returns 404. Will be fixed to allow system audit retrieval directly.

### 2.3 Application Server (`src/dashboard/app.py`)
- FastAPI app with CORS middleware, structured logging, and global exception handler.
- Mounts static files from `frontend/dist` or `static/`.
- In Phase 5C, static asset mounting will be maintained for monolithic local execution while supporting decoupled CORS-protected REST operations for Vercel -> Render production deployment.

### 2.4 Data Ingestion & Seeding (`scripts/init_dashboard_db.py`)
- Currently clears SQLite tables and populates 577 demonstration signals from Phase 4 evaluation outputs (`contaminated_evaluation.csv`, `test.csv`, `expected_observations.csv`).
- Migration target: Create `scripts/seed_demo_data.py` targeting PostgreSQL (`DATABASE_URL`) with deterministic, idempotent insert logic that never exposes ground-truth labels.

### 2.5 Frontend App (`frontend/`)
- React 19 + TypeScript + Vite.
- All API calls in `frontend/src/api/client.ts` use `import.meta.env.VITE_API_BASE_URL || '/api'`.
- Production build targets `frontend/dist/`.
- Vercel target: Build frontend independently using `npm run build` and route API requests to Render backend.

### 2.6 Obsolete Files Assessment (`static/`)
- `static/css/dashboard.css`, `static/js/app.js`, `static/index.html` represent legacy vanilla JS artifacts. The production system exclusively uses `frontend/` (React SPA). `static/` is deprecated and will be documented accordingly.

---

## 3. Environment & Configuration Plan

| Target Component | Variable Name | Purpose / Value |
|---|---|---|
| Backend (Render) | `DATABASE_URL` | PostgreSQL connection string (Neon) |
| Backend (Render) | `CORS_ORIGINS` | Allowed origins (e.g. `https://attendance-analyzer.vercel.app`) |
| Backend (Render) | `ENVIRONMENT` | `production` |
| Backend (Render) | `PORT` | Render provided port binding |
| Frontend (Vercel) | `VITE_API_BASE_URL` | Render backend API endpoint (`https://<render-app>.onrender.com/api`) |

---

## 4. Frozen Files Protection Verification

The following research artifacts remain strictly read-only and frozen:
- `data/processed/attendance_canonical.csv`
- `data/processed/expected_observations.csv`
- `data/processed/school_calendar.csv`
- `data/processed/student_master.csv`
- `data/ml/features.csv`
- `data/ml/train.csv`
- `data/ml/validation.csv`
- `data/ml/test.csv`
- `models/isolation_forest_v1.pkl`
- `models/model_metadata.json`
- `src/anomaly/*`
- `tests/test_phase4_pipeline.py`
