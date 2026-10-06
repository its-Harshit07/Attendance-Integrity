# Phase 5 Dashboard Architecture & System Blueprint

## 1. Existing System Audit & Stack Overview

- **Language & Runtime**: Python 3.13 (Backend Engine) + HTML5/CSS3/Vanilla JS (Browser Frontend)
- **Backend Web Framework**: **FastAPI** + **Uvicorn** (Asynchronous ASGI REST API service)
- **Database / Persistence**: **SQLite3** (`data/dashboard.db`) for persisting human review workflow states (`UNREVIEWED`, `UNDER_REVIEW`, `VALIDATED`, `REJECTED`, `INVESTIGATE`), review notes, and immutable audit logs.
- **Frontend Design System**: Responsive Single-Page Application (SPA) with curated HSL color palette, glassmorphism card styling, Inter/Outfit Google Fonts typography, interactive tables, dynamic metrics, and modular navigation.
- **Phase 4 ML & Anomaly Engines**:
  - `src/anomaly/rule_config.py` (Production Rules $R001$–$R008$)
  - `src/anomaly/rules.py` & `src/anomaly/rule_engine.py` (Rule Engine)
  - `src/anomaly/detector.py` (Isolation Forest Anomaly Detector)
  - `src/anomaly/scoring.py` (Combined Risk Tier Engine)
  - `src/anomaly/explanation.py` (Transparent Administrator Evidence Generator)
  - `models/isolation_forest_v1.pkl` & `models/model_metadata.json` (FROZEN Model Artifacts)

---

## 2. Proposed Dashboard Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                            PHASE 4 EVALUATION DATA ASSETS                         |
|  data/ground_truth/contaminated_evaluation.csv | data/processed/expected_obs.csv  |
|  data/ml/test.csv | models/isolation_forest_v1.pkl | models/model_metadata.json   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               DB INGESTION PIPELINE                               |
|                  scripts/init_db.py  -->  data/dashboard.db (SQLite3)             |
|   Populates: anomalies, evidence, reviews, audit_log (hides ground-truth labels)  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND SERVICE                             |
|                                 src/dashboard/app.py                              |
|   Endpoints: /api/dashboard/summary, /api/anomalies, /api/anomalies/{id}, etc.    |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        ADMINISTRATOR DASHBOARD FRONTEND (SPA)                     |
|                                    static/index.html                              |
|  Views: Overview | Anomaly Queue | Anomaly Detail | Student Context | Reports | Info|
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Schema & Persistence Strategy (`data/dashboard.db`)

1. **`anomalies` Table**:
   - `anomaly_id` (TEXT PRIMARY KEY)
   - `record_id` (TEXT UNIQUE)
   - `student_id` (TEXT)
   - `student_name` (TEXT)
   - `class_id` (TEXT)
   - `date` (TEXT)
   - `anomaly_category` (TEXT) — e.g. `DUPLICATE`, `BEHAVIORAL_SPIKE`, `MISSING_RECORD`
   - `detection_source` (TEXT) — `RULES`, `ML`, `COMBINED`
   - `risk_tier` (TEXT) — `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NORMAL`
   - `anomaly_score` (REAL) — Normalized score $[0.0, 1.0]$
   - `review_status` (TEXT) — `UNREVIEWED`, `UNDER_REVIEW`, `VALIDATED`, `REJECTED`, `INVESTIGATE`
   - `created_at` (TEXT)
   - `updated_at` (TEXT)

2. **`evidence` Table**:
   - `evidence_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `anomaly_id` (TEXT, FOREIGN KEY)
   - `rule_id` (TEXT)
   - `rule_name` (TEXT)
   - `severity` (TEXT)
   - `observed_value` (TEXT)
   - `threshold_value` (TEXT)
   - `expected_value` (TEXT)
   - `explanation` (TEXT)

3. **`reviews` Table**:
   - `review_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `anomaly_id` (TEXT, FOREIGN KEY)
   - `reviewer` (TEXT)
   - `previous_status` (TEXT)
   - `new_status` (TEXT)
   - `note` (TEXT)
   - `timestamp` (TEXT)

4. **`audit_log` Table**:
   - `audit_id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `anomaly_id` (TEXT)
   - `action` (TEXT)
   - `previous_status` (TEXT)
   - `new_status` (TEXT)
   - `reviewer` (TEXT)
   - `note` (TEXT)
   - `timestamp` (TEXT)

---

## 4. API Endpoints Specification

- `GET /api/dashboard/summary`: Summary counters (total, unreviewed, high/med/low risk, data integrity vs behavioral counts).
- `GET /api/anomalies`: List anomaly queue with filtering (status, risk, category, source, search) and pagination/sorting.
- `GET /api/anomalies/{anomaly_id}`: Detail view including evidence, decision info, and review status.
- `GET /api/anomalies/{anomaly_id}/evidence`: Detailed structured evidence rules and feature breakdown.
- `GET /api/anomalies/{anomaly_id}/history`: Review audit trail and history.
- `PATCH /api/anomalies/{anomaly_id}/review`: Submit review state transition (`UNREVIEWED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `VALIDATED` / `REJECTED` / `INVESTIGATE`) with notes.
- `GET /api/students/{student_id}/attendance-context`: Student history, longitudinal exception rate timeline, and peer class context.
- `GET /api/reports/compliance-preview`: Administrator compliance decision-support preview.
- `GET /api/system/info`: Technical provenance, frozen model metadata ($v1.0.0$), seed, rules list, Phase 4 validation test counts.

---

## 5. File Structure Plan

- `src/dashboard/db.py`: SQLite database connection, table initialization, and CRUD operations.
- `src/dashboard/app.py`: FastAPI main application, router registration, CORS, static file serving.
- `src/dashboard/routes.py`: API route handlers for summary, queue, detail, review transitions, student context, reports, system info.
- `scripts/init_dashboard_db.py`: Ingests Phase 4 evaluation data into SQLite database while hiding ground-truth injection IDs from operational administrator display.
- `static/index.html`: Main dashboard HTML template.
- `static/css/dashboard.css`: Custom Vanilla CSS design system.
- `static/js/app.js`: SPA logic, state management, API fetch calls, component rendering.
- `tests/test_phase5_dashboard.py`: Phase 5 backend API & DB unit tests.
- `reports/dashboard/phase5_implementation.md`: Final implementation report.

---

## 6. Experimental Integrity & Privacy Guarantees

1. **Phase 4 Frozen Assets**: `isolation_forest_v1.pkl`, `rule_config.py`, `anomaly_labels.csv` remain strictly untouched.
2. **Neutral Terminology**: Operational UI uses `source exception mark`, `source observation`, `review recommended`, `anomaly score`, `risk tier`.
3. **Hidden Ground-Truth**: Ground-truth target labels (`gt_is_anomaly`) and synthetic `injection_id` values are hidden from normal operational administrator views.
