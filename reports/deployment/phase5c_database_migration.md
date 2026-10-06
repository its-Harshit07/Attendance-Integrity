# Phase 5C Database Migration & Schema Documentation

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — PostgreSQL Migration & Public Deployment Readiness  
**Date**: October 6, 2026  

---

## 1. Overview & Tooling

The operational database layer uses **SQLAlchemy 2.x** and **Alembic** to manage schema migrations across PostgreSQL (Neon production deployment) and local development/test environments.

### DB Stack Components
- **ORM / Schema Engine**: SQLAlchemy 2.1+
- **PostgreSQL Driver**: `psycopg` (v3)
- **Migration Tool**: Alembic 1.20+
- **Production Connection Variable**: `DATABASE_URL`

---

## 2. Operational Schema Definition

The database schema contains **only operational application tables**. Research ground-truth tables (`anomaly_labels`, `injection_log`, `contaminated_evaluation`, `clean_evaluation`) are excluded from operational database storage.

```
+-------------------+        +-------------------+        +-------------------+
|     anomalies     | 1    N |     evidence      | 1    N |      reviews      |
+-------------------+--------+-------------------+--------+-------------------+
| anomaly_id (PK)   |<-------| evidence_id (PK)  |        | review_id (PK)    |
| record_id (UQ)    |        | anomaly_id (FK)   |<-------| anomaly_id (FK)   |
| student_id        |        | rule_id           |        | reviewer          |
| student_name      |        | rule_name         |        | previous_status   |
| class_id          |        | category          |        | new_status        |
| date              |        | severity          |        | note              |
| attendance_status |        | observed_value    |        | timestamp         |
| raw_status        |        | threshold_value   |        +-------------------+
| anomaly_category  |        | expected_value    |
| detection_source  |        | explanation       |
| risk_tier         |        +-------------------+
| anomaly_score     |
| review_status     |        +-------------------+
| created_at        |        |     audit_log     |
| updated_at        |        +-------------------+
+-------------------+        | audit_id (PK)     |
                             | anomaly_id        |
                             | action            |
                             | previous_status   |
                             | new_status        |
                             | reviewer          |
                             | note              |
                             | timestamp         |
                             +-------------------+
```

---

## 3. Migration Commands & Workflow

### 1. Run Migrations on Fresh Database (Production / Neon)
To apply all migration scripts up to the latest revision on a new or existing database:

```bash
# Set PostgreSQL DATABASE_URL in environment or .env
export DATABASE_URL="postgresql+psycopg://username:password@ep-sample-123456.neon.tech/neondb?sslmode=require"

# Apply migrations
alembic upgrade head
```

### 2. Check Migration History & Status
```bash
alembic current
alembic history
```

### 3. Generate New Migration (Development)
When altering SQLAlchemy models in `src/dashboard/db.py`:

```bash
alembic revision --autogenerate -m "description_of_change"
alembic upgrade head
```

---

## 4. Test & Verification

To verify that Alembic migration works reproducibly:
1. `alembic upgrade head` creates all 4 tables (`anomalies`, `evidence`, `reviews`, `audit_log`).
2. Primary keys, foreign keys, and indexes (`ix_anomalies_student_id`, `ix_anomalies_date`, `ix_anomalies_risk_tier`, etc.) are created cleanly without errors.
