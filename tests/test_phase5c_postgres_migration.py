"""
Attendance Integrity System - Phase 5C PostgreSQL Migration & API Test Suite
File: tests/test_phase5c_postgres_migration.py

Tests SQLAlchemy ORM DB abstraction layer, schema initialization, CRUD operations,
review state transitions, audit trail logging, Issue 1 fix, and security data isolation.
"""

import os
import sys
import pytest
from datetime import datetime, timezone

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# Force test database for phase 5c tests
TEST_DB_PATH = os.path.join(BASE_DIR, "data", "test_phase5c_db.sqlite")
os.environ["DATABASE_PATH"] = TEST_DB_PATH

import src.dashboard.db as db_module
db_module.DB_PATH = TEST_DB_PATH
db_module._engine = None
db_module._SessionFactory = None

from src.dashboard.db import (
    init_db, get_session, get_dashboard_summary,
    list_anomalies, get_anomaly_detail, update_anomaly_review,
    get_audit_log_by_anomaly_id, AnomalyModel, EvidenceModel, AuditLogModel
)
from fastapi.testclient import TestClient
from src.dashboard.app import app

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    """Initialize fresh test database before running tests."""
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass
    
    init_db()
    
    # Populate a sample test anomaly
    session = get_session()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    anom = AnomalyModel(
        anomaly_id="ANOM_TEST_001",
        record_id="REC_TEST_001",
        student_id="S001",
        student_name="Test Student",
        class_id="Kls 8",
        date="2025-11-01",
        attendance_status="ABSENT",
        raw_status="S",
        anomaly_category="DUPLICATE",
        detection_source="RULES",
        risk_tier="CRITICAL",
        anomaly_score=-0.05,
        review_status="UNREVIEWED",
        created_at=now_iso,
        updated_at=now_iso
    )
    session.add(anom)
    
    ev = EvidenceModel(
        anomaly_id="ANOM_TEST_001",
        rule_id="R001",
        rule_name="Duplicate Record",
        category="DUPLICATE",
        severity="CRITICAL",
        observed_value="2 records",
        threshold_value="1 record",
        expected_value="Normal Baseline",
        explanation="Multiple records for same student on single date."
    )
    session.add(ev)
    
    audit = AuditLogModel(
        anomaly_id="SYSTEM",
        action="DATABASE_INITIALIZATION",
        previous_status="NONE",
        new_status="UNREVIEWED",
        reviewer="System Pipeline",
        note="Test DB init",
        timestamp=now_iso
    )
    session.add(audit)
    session.commit()
    session.close()
    
    yield
    
    # Teardown
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass


def test_db_schema_creation():
    """Test that operational DB schema creates all required tables."""
    summary = get_dashboard_summary()
    assert summary["total_anomalies"] >= 1
    assert summary["critical_risk_count"] >= 1


def test_anomaly_listing_and_filtering():
    """Test listing anomalies with filters."""
    anomalies, total = list_anomalies(status="UNREVIEWED", risk="CRITICAL")
    assert total >= 1
    assert any(a["anomaly_id"] == "ANOM_TEST_001" for a in anomalies)


def test_review_status_transition_and_audit():
    """Test updating review status and audit log creation."""
    updated = update_anomaly_review(
        anomaly_id="ANOM_TEST_001",
        new_status="VALIDATED",
        note="Confirmed duplicate record",
        reviewer="Test Administrator"
    )
    assert updated["review_status"] == "VALIDATED"
    
    detail = get_anomaly_detail("ANOM_TEST_001")
    assert detail["review_status"] == "VALIDATED"
    assert len(detail["review_history"]) >= 1
    assert detail["review_history"][0]["new_status"] == "VALIDATED"


def test_issue_1_fix_system_audit_log():
    """Verify that Issue 1 is fixed: GET /api/anomalies/SYSTEM/history returns 200 without requiring anomaly record."""
    res = client.get("/api/anomalies/SYSTEM/history")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["status"] == "success"
    assert json_data["anomaly_id"] == "SYSTEM"
    assert len(json_data["audit_trail"]) >= 1


def test_health_endpoint():
    """Test GET /api/health endpoint."""
    res = client.get("/api/health")
    assert res.status_code == 200
    json_data = res.json()
    assert json_data["status"] == "ok"
    assert json_data["service"] == "attendance-integrity-dashboard"
    assert json_data["database"] == "connected"
    assert json_data["model"] == "loaded"


def test_data_security_no_ground_truth_exposure():
    """Verify that no ground-truth target files or injection labels are exposed via API endpoints."""
    res = client.get("/api/system/info")
    assert res.status_code == 200
    text_content = res.text
    assert "anomaly_labels.csv" not in text_content
    assert "injection_log.csv" not in text_content
    assert "DATABASE_URL" not in text_content


def test_cors_preflight_and_origin_headers():
    """Verify OPTIONS preflight and GET requests from Vercel production origin return valid Access-Control-Allow-Origin header."""
    vercel_origin = "https://attendance-integrity.vercel.app"

    # Preflight OPTIONS request
    opt_res = client.options(
        "/api/dashboard/summary",
        headers={
            "Origin": vercel_origin,
            "Access-Control-Request-Method": "GET"
        }
    )
    assert opt_res.status_code == 200
    assert opt_res.headers.get("access-control-allow-origin") == vercel_origin
    assert "GET" in opt_res.headers.get("access-control-allow-methods", "")

    # Normal GET request
    get_res = client.get(
        "/api/dashboard/summary",
        headers={"Origin": vercel_origin}
    )
    assert get_res.status_code == 200
    assert get_res.headers.get("access-control-allow-origin") == vercel_origin
    assert get_res.headers.get("access-control-allow-credentials") == "true"

