"""
Attendance Integrity System - Dashboard FastAPI Application
File: src/dashboard/app.py

Main FastAPI server serving REST API endpoints and static Administrator Dashboard UI.
Configured for production deployment with environment variables, CORS protection,
structured logging, and clean error handling.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.dashboard.db import init_db
from src.dashboard.routes import router as api_router

# Configure Application Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("attendance_integrity")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
STATIC_DIR = os.getenv("FRONTEND_DIST_DIR", FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else os.path.join(BASE_DIR, "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event: Initialize DB and verify operational state on startup."""
    logger.info("Initializing Attendance Integrity Dashboard application...")
    init_db()
    
    # Check if DB is populated; if not, initialize from Phase 4 data
    from src.dashboard.db import get_dashboard_summary
    summary = get_dashboard_summary()
    if summary["total_anomalies"] == 0:
        logger.info("Database empty. Running initial DB ingest from Phase 4 outputs...")
        from scripts.init_dashboard_db import main as init_db_main
        init_db_main()
    
    logger.info(f"Dashboard startup complete. Total records in DB: {summary['total_anomalies']}")
    yield
    logger.info("Shutting down Attendance Integrity Dashboard application.")


app = FastAPI(
    title="Attendance Integrity Administrator Dashboard",
    description="AI-Assisted Decision Support System for Attendance Integrity & Compliance",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Origins
DEFAULT_ALLOWED_ORIGINS = [
    "https://attendance-integrity.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8000"
]

cors_origins_raw = os.getenv("CORS_ORIGINS", "").strip()

if not cors_origins_raw or cors_origins_raw == "*":
    allowed_origins = DEFAULT_ALLOWED_ORIGINS
else:
    parsed_origins = [o.strip().rstrip("/") for o in cors_origins_raw.split(",") if o.strip()]
    allowed_origins = list(dict.fromkeys(parsed_origins + DEFAULT_ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Global Exception Handler (Suppress Raw Tracebacks)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred."}
    )


# Register API Router
app.include_router(api_router)

# Mount Static Files (Frontend SPA)
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    env_mode = os.getenv("ENVIRONMENT", "production").lower()
    is_reload = env_mode == "development"
    
    logger.info(f"Starting server on {host}:{port} (mode={env_mode}, reload={is_reload})")
    uvicorn.run("src.dashboard.app:app", host=host, port=port, reload=is_reload)
