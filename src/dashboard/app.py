"""
Attendance Integrity System - Dashboard FastAPI Application
File: src/dashboard/app.py

Main FastAPI server serving REST API endpoints and static Administrator Dashboard UI.
Configured for production deployment with environment variables, CORS protection,
structured logging, and clean error handling.
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

# Ensure project root is in sys.path when running as a direct script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

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

FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
STATIC_DIR = os.getenv("FRONTEND_DIST_DIR", FRONTEND_DIST if os.path.exists(FRONTEND_DIST) else os.path.join(BASE_DIR, "static"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event: Validate production config, initialize DB and verify operational state."""
    logger.info("Initializing Attendance Integrity Dashboard application...")
    
    # 1. Enforce strict production configuration validation
    from src.dashboard.auth import validate_production_configuration
    validate_production_configuration()

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


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https: blob:; "
        "connect-src 'self' https://attendance-integrity.vercel.app http://localhost:5173 http://localhost:3000 http://127.0.0.1:8000; "
        "frame-ancestors 'none';"
    )
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Phase 1W: Explicit cache hardening for all API responses
    # Applies to all /api/ endpoints (success, 401, 403, 404, 429, 500)
    # Preserves stronger endpoint-specific cache directives (e.g. OTP retrieval headers)
    if request.url.path.startswith("/api"):
        if "cache-control" not in response.headers:
            response.headers["Cache-Control"] = "no-store, private"

    # Mandatory Session Hardening: Clear authentication cookies on 401 Unauthorized responses
    if response.status_code == 401 and request.url.path.startswith("/api"):
        response.delete_cookie("attendance_session", path="/")
        response.delete_cookie("attendance_csrf", path="/")

    return response


# Global Exception Handler (Suppress Raw Tracebacks)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    headers = {}
    if request.url.path.startswith("/api"):
        headers["Cache-Control"] = "no-store, private"
    return JSONResponse(
        status_code=500,
        headers=headers,
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
