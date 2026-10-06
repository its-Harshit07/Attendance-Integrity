# Production Environment Variables Reference

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — Public Deployment Readiness  
**Date**: October 6, 2026  

---

## 1. Backend Environment Variables (Render / Server)

| Environment Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes (Prod) | `postgresql+psycopg://user:pass@ep-host.neon.tech/neondb?sslmode=require` | PostgreSQL database connection string |
| `CORS_ORIGINS` | Yes (Prod) | `https://attendance-analyzer.vercel.app` | Comma-separated list of allowed frontend origins |
| `ENVIRONMENT` | Yes | `production` | Runtime mode (`production` disables dev reload) |
| `PORT` | Yes (Render)| `8000` | Port provided by Render environment |
| `HOST` | No | `0.0.0.0` | Binding interface for HTTP server |
| `LOG_LEVEL` | No | `INFO` | Standard logging level |

---

## 2. Frontend Environment Variables (Vercel)

| Environment Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `https://attendance-integrity-backend.onrender.com/api` | Base URL for REST API endpoints |

---

## 3. Secret Management Guidelines

- Never commit real `.env` files or connection strings containing passwords to Git.
- Always use `.env.example` as a template for team developers.
- Supply sensitive credentials directly through Render and Vercel project environment settings.
