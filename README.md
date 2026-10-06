# Attendance Integrity System & Administrator Dashboard

An AI-assisted, human-in-the-loop decision-support system for student attendance integrity monitoring, data quality assurance, and compliance reporting.

---

## 🚀 System Architecture & Deployment Overview

```text
       [ Vercel SPA Frontend ]
     (React 19 + TypeScript + Vite)
                   │
                   │ HTTPS REST API (VITE_API_BASE_URL)
                   ▼
        [ Render FastAPI Backend ]
          (src/dashboard/app.py)
                   │
                   │ DATABASE_URL (PostgreSQL)
                   ▼
        [ Neon Serverless PostgreSQL ]
     (anomalies, evidence, reviews, audit_log)
```

- **Frontend**: React 19 + TypeScript + Vite application (White-First SaaS theme). Deployed to **Vercel**.
- **Backend**: Python FastAPI REST server (`src/dashboard/app.py`). Deployed to **Render**.
- **Operational Database**: PostgreSQL database managed via **SQLAlchemy 2.x** and **Alembic**. Hosted on **Neon**.
- **Machine Learning Core**: Frozen Isolation Forest model (`v1.0.0`, seed 42) + Production Rules $R001$–$R008$.

---

## 🔒 Frozen Research Contract & Evaluation Results

All Phase 4 core artifacts (canonical attendance dataset, temporal feature engineering pipeline, Isolation Forest model weights, operating threshold `-0.001252`, production rules $R001$–$R008$, and evaluation outputs) remain **100% frozen and unmodified**.

### November Test Dataset Performance Summary
- **Rules Only**: Precision 29.03%, Recall 62.07%, F1 0.3956, Accuracy 95.80%
- **Isolation Forest Only**: Precision 16.67%, Recall 36.21%, F1 0.2283, Accuracy 94.58%
- **Combined System**: Precision 22.56%, Recall 63.79%, F1 0.3333, Accuracy 94.35%

---

## 🛠️ Local Development & Quick Start

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.13.3)
- Node.js 18+ and npm 9+

### 2. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd ATTENDANCE_ANALYZER

# Install Python dependencies
pip install -r requirements.txt

# Create local environment configuration
cp .env.example .env
```

### 3. Initialize & Seed Local Operational Database
```bash
# Run database migrations
alembic upgrade head

# Seed operational demonstration signals (577 signals)
python scripts/seed_demo_data.py
```

### 4. Start Local Backend & Frontend
```bash
# Terminal 1: Backend API (FastAPI)
python src/dashboard/app.py

# Terminal 2: Frontend SPA (React + Vite)
cd frontend
npm install
npm run dev
```

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API Base**: `http://localhost:8000/api`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/health`

---

## 🧪 Automated Testing & Deployment Validation

Run the complete test suite (37 total assertions across Phase 4, Phase 5, and Phase 5C):

```bash
# Run all automated test suites
python -m pytest -v tests/test_phase4_pipeline.py tests/test_phase5_dashboard.py tests/test_phase5c_postgres_migration.py

# Run deployment readiness validator
python scripts/validate_deployment.py
```

---

## 🌐 Public Cloud Deployment Guide

### A. Frontend → Vercel
1. Connect Git repository to **Vercel**.
2. Set **Root Directory**: `frontend`
3. Set **Framework Preset**: Vite (`Build Command: npm run build`, `Output Directory: dist`).
4. Set Environment Variable:
   - `VITE_API_BASE_URL`: `https://<render-backend-name>.onrender.com/api`

### B. Backend → Render
1. Create a new **Web Service** on **Render**.
2. Set **Build Command**: `pip install -r requirements.txt`
3. Set **Start Command**: `uvicorn src.dashboard.app:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: Neon PostgreSQL connection string (`postgresql+psycopg://...`)
   - `CORS_ORIGINS`: Deployed Vercel origin (`https://<app>.vercel.app`)
   - `ENVIRONMENT`: `production`

### C. Database → Neon PostgreSQL
1. Create a serverless PostgreSQL database on **Neon**.
2. Copy `DATABASE_URL` into Render environment settings.
3. Apply migrations and seed demo data:
   ```bash
   alembic upgrade head
   python scripts/seed_demo_data.py
   ```

---

## 🛡️ Security, Privacy & Operational Data Policy

1. **Operational Data Separation**: The production database contains ONLY operational application records (`anomalies`, `evidence`, `reviews`, `audit_log`).
2. **Ground-Truth Protection**: Evaluation ground truth (`anomaly_labels.csv`, `injection_log.csv`, `contaminated_evaluation.csv`) is strictly protected and never exposed via API endpoints or inserted into operational application databases.
3. **CORS Protection**: Allowed browser origins are strictly restricted via environment configuration (`CORS_ORIGINS`).
4. **Secret Management**: Connection credentials, passwords, and secrets are never committed to version control.

---

## 📄 License & Dataset Citation

- **Source Dataset**: Zenodo Repository (DOI: [10.5281/zenodo.18902017](https://doi.org/10.5281/zenodo.18902017))
- **Documentation Reports**: Located under `reports/` (`reports/deployment/`, `reports/dashboard/`, `reports/evaluation/`).
