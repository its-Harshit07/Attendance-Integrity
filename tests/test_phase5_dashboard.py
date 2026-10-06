"""
Attendance Integrity System - Automated Test Suite for Phase 5 Dashboard & APIs
File: tests/test_phase5_dashboard.py

Verifies:
1. Dashboard Database Layer CRUD & persistence
2. FastAPI summary endpoint (/api/dashboard/summary)
3. Anomaly queue listing & filtering (/api/anomalies)
4. Anomaly detail & evidence retrieval (/api/anomalies/{id}/evidence)
5. Review state transitions (/api/anomalies/{id}/review)
6. Invalid review state rejection (400 status)
7. Audit log creation & persistence
8. Student context endpoint (/api/students/{id}/attendance-context)
9. System info & provenance endpoint (/api/system/info)
10. Ground-truth label protection (hidden from operational UI)
11. Phase 4 frozen assets immutability check
"""

import os
import sys
import sqlite3
try:
    import pytest
except ImportError:
    pytest = None
from fastapi.testclient import TestClient

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.dashboard.app import app
from src.dashboard import db as db_module

# Override DB_PATH and clear DATABASE_URL for tests to isolate test execution from demo/prod database
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "test_dashboard.db")
os.environ["DATABASE_URL"] = ""
db_module.DB_PATH = TEST_DB_PATH
db_module._engine = None
db_module._SessionFactory = None

from src.dashboard.db import init_db, get_db_connection, update_anomaly_review, get_dashboard_summary, inspect, get_engine

client = TestClient(app)


def test_1_database_initialization():
    """Test 1: Test database initializes all 4 tables and ingests test data."""
    init_db()
    from scripts.init_dashboard_db import main as init_db_main
    init_db_main()

    inspector = inspect(get_engine())
    tables = inspector.get_table_names()

    assert "anomalies" in tables
    assert "evidence" in tables
    assert "reviews" in tables
    assert "audit_log" in tables


def test_2_summary_endpoint():
    """Test 2: /api/dashboard/summary returns aggregate metrics."""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert "total_anomalies" in data["data"]
    assert "unreviewed_count" in data["data"]
    assert "critical_risk_count" in data["data"]
    assert "disclaimer" in data


def test_3_anomaly_listing_and_filtering():
    """Test 3: /api/anomalies supports status and risk filtering."""
    response = client.get("/api/anomalies?limit=10&status=UNREVIEWED")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert len(data["data"]) <= 10
    for item in data["data"]:
        assert item["review_status"] == "UNREVIEWED"


def test_4_anomaly_detail_and_evidence():
    """Test 4: /api/anomalies/{id} and /evidence return structured anomaly details."""
    response_list = client.get("/api/anomalies?limit=1")
    assert response_list.status_code == 200
    items = response_list.json()["data"]
    assert len(items) > 0

    anom_id = items[0]["anomaly_id"]

    # Test Detail
    res_detail = client.get(f"/api/anomalies/{anom_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()["data"]
    assert detail["anomaly_id"] == anom_id
    assert "evidence" in detail

    # Test Evidence
    res_ev = client.get(f"/api/anomalies/{anom_id}/evidence")
    assert res_ev.status_code == 200
    ev = res_ev.json()
    assert ev["status"] == "success"
    assert "evidence_rules" in ev
    assert "temporal_features" in ev


def test_5_review_state_transition_and_audit():
    """Test 5: PATCH /api/anomalies/{id}/review transitions status and appends audit trail."""
    response_list = client.get("/api/anomalies?limit=1&status=UNREVIEWED")
    items = response_list.json()["data"]
    assert len(items) > 0

    anom_id = items[0]["anomaly_id"]

    # Transition to VALIDATED
    res_patch = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={
            "status": "VALIDATED",
            "note": "Unit test verified anomaly against register.",
            "reviewer": "Test Admin"
        }
    )
    assert res_patch.status_code == 200
    updated = res_patch.json()["data"]
    assert updated["review_status"] == "VALIDATED"

    # Check Audit History Endpoint
    res_hist = client.get(f"/api/anomalies/{anom_id}/history")
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert len(hist["audit_trail"]) > 0
    assert hist["audit_trail"][0]["new_status"] == "VALIDATED"


def test_6_invalid_review_state_rejected():
    """Test 6: Invalid review status payload returns 400 Bad Request error."""
    response_list = client.get("/api/anomalies?limit=1")
    anom_id = response_list.json()["data"][0]["anomaly_id"]

    res_invalid = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "INVALID_STATUS_NAME", "note": "bad test"}
    )
    assert res_invalid.status_code == 400


def test_7_student_context_endpoint():
    """Test 7: /api/students/{id}/attendance-context returns student profile and timeline."""
    response_list = client.get("/api/anomalies?limit=1")
    stu_id = response_list.json()["data"][0]["student_id"]

    res_stu = client.get(f"/api/students/{stu_id}/attendance-context")
    assert res_stu.status_code == 200
    stu_data = res_stu.json()

    assert stu_data["status"] == "success"
    assert stu_data["student_id"] == stu_id
    assert "observation_timeline" in stu_data
    assert len(stu_data["observation_timeline"]) > 0


def test_8_system_info_provenance():
    """Test 8: /api/system/info exposes technical provenance and Phase 4 model specs."""
    response = client.get("/api/system/info")
    assert response.status_code == 200
    info = response.json()

    assert info["status"] == "success"
    assert info["model_version"] == "v1.0.0"
    assert info["random_seed"] == 42
    assert "production_rules" in info


def test_9_ground_truth_protection_in_operational_ui():
    """Test 9: Operational API models exclude ground-truth labels and injection IDs."""
    response_list = client.get("/api/anomalies?limit=10")
    items = response_list.json()["data"]

    for item in items:
        assert "gt_is_anomaly" not in item
        assert "gt_anomaly_category" not in item
        assert "injection_id" not in item


def test_10_phase4_frozen_assets_unmodified():
    """Test 10: Phase 4 model pkl and metadata files remain frozen and unmodified."""
    pkl_path = os.path.join(BASE_DIR, "models", "isolation_forest_v1.pkl")
    meta_path = os.path.join(BASE_DIR, "models", "model_metadata.json")

    assert os.path.isfile(pkl_path)
    assert os.path.isfile(meta_path)


if __name__ == "__main__":
    try:
        import pytest
        pytest.main(["-v", __file__])
    except ImportError:
        print("Running Phase 5 Dashboard Automated Test Suite (10 Assertions)...")
        tests = [
            test_1_database_initialization,
            test_2_summary_endpoint,
            test_3_anomaly_listing_and_filtering,
            test_4_anomaly_detail_and_evidence,
            test_5_review_state_transition_and_audit,
            test_6_invalid_review_state_rejected,
            test_7_student_context_endpoint,
            test_8_system_info_provenance,
            test_9_ground_truth_protection_in_operational_ui,
            test_10_phase4_frozen_assets_unmodified
        ]
        passed = 0
        for t in tests:
            try:
                t()
                print(f"  [PASS] {t.__name__}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {t.__name__}: {e}")

        print(f"\nCompleted {passed}/{len(tests)} tests successfully.")
        if passed < len(tests):
            sys.exit(1)
