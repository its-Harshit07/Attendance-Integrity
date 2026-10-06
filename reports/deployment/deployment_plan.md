# Production Deployment Plan

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5B — Production Hardening & Deployment Candidate  
**Date**: October 6, 2026  

---

## 1. Deployment Overview & Architecture

The Attendance Integrity Administrator Dashboard is packaged as a unified, production-ready web application:
- **Backend API**: Python FastAPI application (`src/dashboard/app.py`).
- **Frontend SPA**: React 19 + TypeScript single-page application bundled via Vite into `frontend/dist` and mounted directly by FastAPI.
- **Storage**: SQLite database (`data/dashboard.db`).
- **ML Artifact**: Frozen Isolation Forest model (`models/isolation_forest_v1.pkl`).

---

## 2. Target Deployment Environment & Prerequisites

### Server Requirements
- **OS**: Linux (Ubuntu 22.04 LTS / Debian 12) or Windows Server
- **Python**: 3.10+ (with `venv` or `conda`)
- **Node.js**: 18+ (for building frontend assets)
- **RAM**: 2 GB minimum (4 GB recommended)
- **Disk**: 1 GB free storage space

---

## 3. Step-by-Step Deployment Guide

### Step 1: Clone Repository & Create Python Environment
```bash
git clone <repository-url>
cd ATTENDANCE_ANALYZER

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install fastapi uvicorn httpx scikit-learn
```

### Step 2: Build Frontend Static Production Bundle
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 3: Initialize Operational Demonstration Database
```bash
python scripts/init_dashboard_db.py
```

### Step 4: Configure Environment Variables
Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Set appropriate production settings:

```ini
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=production
DATABASE_PATH=data/dashboard.db
CORS_ORIGINS=https://dashboard.school.edu
FRONTEND_DIST_DIR=frontend/dist
```

### Step 5: Start Production Server
For production execution, launch `uvicorn` (or `gunicorn` with uvicorn workers):

```bash
# Direct uvicorn execution
uvicorn src.dashboard.app:app --host 0.0.0.0 --port 8000 --workers 2

# Or via Python module
python src/dashboard/app.py
```

---

## 4. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Network interface address to bind server |
| `PORT` | `8000` | Network port for HTTP server |
| `ENVIRONMENT` | `production` | Environment mode (`production` disables dev reload) |
| `DATABASE_PATH` | `data/dashboard.db` | Absolute or relative path to SQLite database |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated or wildcard) |
| `FRONTEND_DIST_DIR`| `frontend/dist` | Path to compiled React SPA static distribution folder |
| `VITE_API_BASE_URL`| `/api` | Frontend API base URL (configured during frontend build) |

---

## 5. Artifact & Asset Verification

- **Model Artifact**: `models/isolation_forest_v1.pkl` (742 KB) — Loaded read-only on startup.
- **Model Metadata**: `models/model_metadata.json` — Version `v1.0.0`, Seed `42`, Threshold `-0.001252`.
- **Static Assets**: `frontend/dist/index.html`, `frontend/dist/assets/*`.

---

## 6. Database Deployment & Scalability Notice

> [!WARNING]
> **Database Architecture Notice**: SQLite is currently used for the project demonstration / deployment candidate. A managed relational database (such as PostgreSQL or MySQL) would be appropriate for multi-user concurrent production deployment with high transaction volume.

---

## 7. Known Limitations & Scope Boundaries

1. **Development Authentication**: Current dashboard uses administrator identity selection (`Administrator (Dev)`). Production enterprise authentication (SSO / OAuth2 / SAML) is outside the current Phase 5 scope.
2. **Read-Only Model Pipelines**: Model inference is static and frozen. On-the-fly retraining or rule threshold modifications are disabled by design to preserve experimental reproducibility.
