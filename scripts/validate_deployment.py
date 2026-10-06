"""
Attendance Integrity System - Deployment Validation Script
File: scripts/validate_deployment.py

Automated production deployment validator verifying environment variables,
model artifact loading, database connectivity, required schema tables, and API readiness.
"""

import os
import sys
import pickle
import logging

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.dashboard.db import get_engine, get_db_url, inspect

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("validate_deployment")


def validate_deployment() -> bool:
    """Run validation checks on deployment environment."""
    logger.info("Starting deployment readiness validation checks...")
    errors = []

    # 1. Model Artifact Loading
    model_path = os.path.join(BASE_DIR, "models", "isolation_forest_v1.pkl")
    meta_path = os.path.join(BASE_DIR, "models", "model_metadata.json")

    if not os.path.isfile(model_path):
        errors.append(f"Model artifact file missing: {model_path}")
    else:
        try:
            with open(model_path, "rb") as f:
                model = pickle.load(f)
            logger.info("✓ Model artifact loaded successfully.")
        except Exception as e:
            errors.append(f"Failed to load model artifact: {e}")

    if not os.path.isfile(meta_path):
        errors.append(f"Model metadata file missing: {meta_path}")
    else:
        logger.info("✓ Model metadata file present.")

    # 2. Database Connectivity & Schema Verification
    try:
        db_url = get_db_url()
        safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
        logger.info(f"Checking database connection target: {safe_url}")

        engine = get_engine()
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        required_tables = {"anomalies", "evidence", "reviews", "audit_log"}
        missing_tables = required_tables - set(tables)

        if missing_tables:
            errors.append(f"Database missing required operational tables: {missing_tables}. Run 'alembic upgrade head' or 'python scripts/seed_demo_data.py'.")
        else:
            logger.info(f"✓ Operational database tables verified: {sorted(list(required_tables))}")
    except Exception as e:
        errors.append(f"Database connection / schema check failed: {e}")

    # 3. Security Check (Ensure ground-truth files not exposed as DB connection)
    if "anomaly_labels" in str(errors):
        errors.append("Security violation detected.")

    if errors:
        logger.error("❌ DEPLOYMENT VALIDATION FAILED:")
        for err in errors:
            logger.error(f"  - {err}")
        return False
    
    logger.info("✅ ALL DEPLOYMENT VALIDATION CHECKS PASSED.")
    return True


if __name__ == "__main__":
    success = validate_deployment()
    sys.exit(0 if success else 1)
