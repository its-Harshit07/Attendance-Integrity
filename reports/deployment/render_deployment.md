# Backend Deployment Documentation — Render

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — Public Deployment Readiness  
**Target Platform**: Render (FastAPI + Python 3.13)  

---

## 1. Web Service Configuration

The FastAPI backend under `src/dashboard/app.py` is configured for deployment as a Render Web Service.

### Render Service Settings
- **Environment**: Python 3
- **Region**: Oregon (US West) or closest region to Neon PostgreSQL instance
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn src.dashboard.app:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/api/health`

---

## 2. Environment Variables on Render

In Render Dashboard -> Service -> Environment:

| Variable | Value / Format | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL Connection String | `postgresql+psycopg://user:pass@ep-sample.neon.tech/neondb?sslmode=require` |
| `CORS_ORIGINS` | Deployed Vercel Frontend Origin | `https://attendance-analyzer.vercel.app` |
| `ENVIRONMENT` | `production` | `production` |
| `LOG_LEVEL` | `INFO` | `INFO` |

---

## 3. Database Migration & Seed Instructions on Render

After deploying the backend service on Render, execute Alembic migration and demo seeding using Render Shell or local execution targeting Neon `DATABASE_URL`:

```bash
# 1. Apply database migrations
alembic upgrade head

# 2. Seed operational demonstration database (577 signals)
python scripts/seed_demo_data.py
```
