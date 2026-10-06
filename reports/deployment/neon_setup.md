# Database Deployment Documentation — Neon PostgreSQL

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — Public Deployment Readiness  
**Target Platform**: Neon PostgreSQL (Serverless Cloud Database)  

---

## 1. Neon Database Provisioning

1. Log into [Neon Console](https://console.neon.tech).
2. Create a new PostgreSQL Project named `attendance-integrity-db`.
3. Select default PostgreSQL version (v15 or v16).
4. Copy the connection string from the Neon dashboard dashboard.

### Connection String Format
```text
postgres://<username>:<password>@<ep-hostname>.neon.tech/<dbname>?sslmode=require
```

---

## 2. Integration with FastAPI & Alembic

The backend DB abstraction layer (`src/dashboard/db.py`) automatically normalizes Neon connection strings starting with `postgres://` or `postgresql://` to `postgresql+psycopg://` for compatibility with SQLAlchemy 2.x and `psycopg` 3.

---

## 3. Database Initialization Steps

From local terminal or deployment runner with `DATABASE_URL` configured:

```bash
# Set Neon connection string
export DATABASE_URL="postgresql+psycopg://<username>:<password>@<ep-hostname>.neon.tech/<dbname>?sslmode=require"

# 1. Run Alembic schema migrations
alembic upgrade head

# 2. Seed operational demonstration signals
python scripts/seed_demo_data.py
```
