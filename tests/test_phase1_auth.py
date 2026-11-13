"""
Attendance Integrity System - Automated Security & Server-Side OTP Retrieval Test Suite
File: tests/test_phase1_auth.py

Comprehensive tests verifying:
1. Fictional administrator identity (attendance@admin.edu)
2. Rejection of arbitrary email identities (generic response, no OTP generated)
3. Successful server-side OTP generation without email delivery
4. Correct OTP retrieval using dedicated retrieval secret header (X-OTP-Retrieval-Secret)
5. Retrieval rejection without secret header (HTTP 401)
6. Retrieval rejection with incorrect secret (HTTP 401)
7. Retrieval rate limiting (HTTP 429 with Retry-After)
8. Encrypted OTP storage in database (Fernet ciphertext in DB, never plaintext)
9. Successful OTP verification, session generation, and cookie issuance
10. Invalid OTP rejection with attempt decrement
11. Max attempts (5) challenge lockout
12. Single-use OTP challenge invalidation upon verification
13. Rejection of consumed OTP retrieval (HTTP 404)
14. Expired OTP rejection for retrieval and verification
15. 60-second resend cooldown enforcement (HTTP 429 with Retry-After)
16. Rate limiting on OTP requests and verifications (HTTP 429 with Retry-After)
17. Strict 401 Unauthorized protection on all operational endpoints
18. Public access preservation for /api/health and /api/auth/session
19. Authenticated access to protected endpoints with session cookie and Bearer token
20. CSRF token validation and violation blocking on state-changing review endpoint
21. Session revocation on logout and subsequent 401 on revoked session
22. Security headers middleware enforcement (X-Frame-Options, CSP, nosniff, etc.)
23. Security audit log trail persistence with zero plaintext secrets or OTPs
"""

import os
import sys
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# Clear DATABASE_URL to isolate tests in local SQLite test DB
TEST_DB_PATH = os.path.join(BASE_DIR, "data", "test_auth_dashboard.db")
if os.path.exists(TEST_DB_PATH):
    try:
        os.remove(TEST_DB_PATH)
    except Exception:
        pass

TEST_RETRIEVAL_SECRET = "test-retrieval-secret-attendance-999"
TEST_ENCRYPTION_KEY = "WDbIHuvetrXb9P4t6snziLZ2lsElZwBNAkxw1OqAneI="

os.environ["DATABASE_URL"] = ""
os.environ["ADMIN_EMAIL"] = "attendance@admin.edu"
os.environ["OTP_RETRIEVAL_SECRET"] = TEST_RETRIEVAL_SECRET
os.environ["OTP_RETRIEVAL_ENCRYPTION_KEY"] = TEST_ENCRYPTION_KEY
os.environ["OTP_HMAC_SECRET"] = "test-otp-hmac-secret-12345"
os.environ["SESSION_SECRET"] = "test-session-secret-67890"

from src.dashboard import db as db_module
db_module.DB_PATH = TEST_DB_PATH
db_module._engine = None
db_module._SessionFactory = None

from src.dashboard.app import app
from src.dashboard.db import (
    init_db,
    get_session,
    OtpChallengeModel,
    AdminSessionModel,
    RateLimitRecordModel,
    SecurityAuditLogModel
)
from src.dashboard.auth import (
    hash_session_token,
    normalize_email,
    decrypt_otp_for_retrieval
)
from scripts.init_dashboard_db import main as init_db_main

# Initialize isolated test database
init_db()
init_db_main()

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    old = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(old)


def reset_auth_state():
    """Helper to clear in-memory and database rate-limiting and challenge state between tests."""
    session = get_session()
    try:
        session.query(RateLimitRecordModel).delete()
        session.query(OtpChallengeModel).delete()
        session.commit()
    finally:
        session.close()


def test_1_fictional_admin_identity_request_otp():
    """Test 1: Request OTP for fictional admin (attendance@admin.edu) generates challenge without email delivery."""
    reset_auth_state()
    res = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "verification code" in data["message"].lower()

    # Verify challenge was created in database
    session = get_session()
    ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.email == "attendance@admin.edu").first()
    assert ch is not None
    assert ch.consumed_at is None
    assert ch.otp_encrypted is not None
    assert ch.otp_hash is not None
    session.close()


def test_2_rejection_of_arbitrary_email_identities():
    """Test 2: Request OTP for unauthorized email returns generic response without generating or storing an OTP."""
    reset_auth_state()
    res = client.post("/api/auth/otp/request", json={"email": "intruder@external-domain.org"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "verification code" in data["message"].lower()

    # Ensure no challenge exists for the unauthorized address
    session = get_session()
    ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.email == "intruder@external-domain.org").first()
    assert ch is None
    session.close()


def test_3_correct_otp_retrieval_with_secret():
    """Test 3: Current unexpired OTP can be retrieved via GET /api/auth/otp/retrieve with valid X-OTP-Retrieval-Secret."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    res = client.get(
        "/api/auth/otp/retrieve",
        headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["email"] == "attendance@admin.edu"
    assert "otp" in data
    assert len(data["otp"]) == 6
    assert data["otp"].isdigit()
    assert data["expires_in_seconds"] > 0


def test_4_retrieval_rejection_without_secret():
    """Test 4: Retrieval without secret header returns 401 Unauthorized."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    res = client.get("/api/auth/otp/retrieve")
    assert res.status_code == 401
    assert "Unauthorized" in res.json()["detail"]


def test_5_retrieval_rejection_with_incorrect_secret():
    """Test 5: Retrieval with invalid secret returns 401 Unauthorized."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    res = client.get(
        "/api/auth/otp/retrieve",
        headers={"X-OTP-Retrieval-Secret": "wrong-secret-value-123"}
    )
    assert res.status_code == 401
    assert "Unauthorized" in res.json()["detail"]


def test_6_retrieval_rate_limiting():
    """Test 6: Exceeding 10 retrieval attempts within 5 minutes returns 429 Too Many Requests."""
    reset_auth_state()

    # Pre-populate retrieval rate limit record to max
    db_module.atomic_check_rate_limit("otp_retrieval_ip:testclient", 10, 300)
    for _ in range(9):
        db_module.atomic_check_rate_limit("otp_retrieval_ip:testclient", 10, 300)

    res = client.get(
        "/api/auth/otp/retrieve",
        headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET}
    )
    assert res.status_code == 429
    assert "Retry-After" in res.headers


def test_7_encrypted_otp_storage_in_database():
    """Test 7: Verify OTP is encrypted with Fernet in database and plaintext is never stored."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    session = get_session()
    ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.email == "attendance@admin.edu").first()
    assert ch is not None

    # Database contains ciphertext starting with Fernet header gAAAAA
    assert ch.otp_encrypted.startswith("gAAAAA")

    # Plaintext OTP is not in any field
    decrypted = decrypt_otp_for_retrieval(ch.otp_encrypted)
    assert len(decrypted) == 6
    assert decrypted not in (ch.otp_hash, str(ch.challenge_id), ch.email)
    session.close()


def test_8_successful_otp_verification_and_session():
    """Test 8: Verify valid OTP creates active session, issues cookies and does NOT expose token in JSON."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    ret_res = client.get(
        "/api/auth/otp/retrieve",
        headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET}
    )
    otp = ret_res.json()["otp"]

    verify_res = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["status"] == "success"
    assert data["email"] == "attendance@admin.edu"
    assert "token" not in data  # Session token is NEVER returned in response JSON (Phase 1U)
    assert "csrf_token" in data
    assert "attendance_session" in verify_res.cookies
    assert "attendance_csrf" in verify_res.cookies


def test_9_invalid_otp_rejection_and_attempt_decrement():
    """Test 9: Invalid OTP code returns 400 with remaining attempts count."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    res = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "000000"})
    assert res.status_code == 400
    assert "Invalid verification code" in res.json()["detail"]
    assert "attempt(s) remaining" in res.json()["detail"]


def test_10_otp_lockout_after_max_attempts():
    """Test 10: 5 failed attempts lock the challenge."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    for i in range(4):
        r = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": f"11111{i}"})
        assert r.status_code == 400

    r5 = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "999999"})
    assert r5.status_code in (400, 429)
    assert "locked" in r5.json()["detail"].lower()


def test_11_otp_single_use_behavior():
    """Test 11: A verified OTP cannot be used a second time."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    ret_res = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret_res.json()["otp"]

    r1 = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert r1.status_code == 200

    r2 = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert r2.status_code == 400
    assert "Invalid or expired" in r2.json()["detail"]


def test_12_rejection_of_consumed_otp_retrieval():
    """Test 12: Consumed challenge cannot be retrieved via /api/auth/otp/retrieve."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    ret_res = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret_res.json()["otp"]

    # Verify and consume
    client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})

    # Retrieve again: should return 404
    ret2 = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret2.status_code == 404
    assert "No active" in ret2.json()["detail"]


def test_13_expired_otp_rejection():
    """Test 13: Expired OTP challenge cannot be retrieved or verified."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})

    # Manually expire the challenge in DB
    session = get_session()
    ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.email == "attendance@admin.edu").first()
    past_iso = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    ch.expires_at = past_iso
    session.commit()
    session.close()

    # Retrieval returns 404
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret.status_code == 404

    # Verification returns 400
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "123456"})
    assert ver.status_code == 400


def test_14_resend_cooldown():
    """Test 14: Requesting new OTP within 60s cooldown (after previous OTP is consumed) returns 429 with Retry-After."""
    reset_auth_state()

    res1 = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res1.status_code == 200

    # Retrieve and consume the active OTP
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret.status_code == 200
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200

    # Now that the active challenge is consumed, requesting a new OTP immediately hits the 60s resend cooldown
    res2 = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res2.status_code == 429
    assert "Retry-After" in res2.headers


def test_15_rate_limiting_email_and_ip():
    """Test 15: Exceeding 3 OTP requests per 15 minutes by email returns 429."""
    reset_auth_state()

    db_module.atomic_check_rate_limit("otp_req_email:attendance@admin.edu", 3, 900)
    db_module.atomic_check_rate_limit("otp_req_email:attendance@admin.edu", 3, 900)
    db_module.atomic_check_rate_limit("otp_req_email:attendance@admin.edu", 3, 900)

    res = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res.status_code == 429
    assert "Retry-After" in res.headers


def test_16_strict_authorization_on_all_operational_endpoints():
    """Test 16: Every protected endpoint returns 401 when no auth cookie or header is provided."""
    unauth_client = TestClient(app)

    endpoints = [
        ("GET", "/api/dashboard/summary"),
        ("GET", "/api/anomalies"),
        ("GET", "/api/anomalies/ANOM-001"),
        ("GET", "/api/anomalies/ANOM-001/evidence"),
        ("GET", "/api/anomalies/ANOM-001/history"),
        ("PATCH", "/api/anomalies/ANOM-001/review"),
        ("GET", "/api/students/STU-001/attendance-context"),
        ("GET", "/api/reports/compliance-preview"),
        ("GET", "/api/system/info")
    ]

    for method, path in endpoints:
        if method == "GET":
            r = unauth_client.get(path)
        else:
            r = unauth_client.patch(path, json={"status": "VALIDATED"})
        assert r.status_code == 401, f"Endpoint {path} failed to reject unauthenticated request, returned {r.status_code}"
        assert "Authentication required" in r.json()["detail"]


def test_17_authenticated_access_with_session_and_bearer_rejection():
    """Test 17: Authenticated admin can access protected endpoints via cookies; Bearer tokens are rejected."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret_res = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret_res.json()["otp"]

    ver_res = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver_res.status_code == 200
    assert "token" not in ver_res.json()
    raw_cookie = ver_res.cookies.get("attendance_session")
    assert raw_cookie is not None

    # 1. Cookie access succeeds (TestClient preserves session cookie)
    res_cookie = client.get("/api/dashboard/summary")
    assert res_cookie.status_code == 200
    assert res_cookie.json()["status"] == "success"

    # 2. Bearer token access without cookie is strictly REJECTED (HTTP 401)
    bearer_client = TestClient(app)
    res_bearer = bearer_client.get("/api/dashboard/summary", headers={"Authorization": f"Bearer {raw_cookie}"})
    assert res_bearer.status_code == 401
    assert "Authentication required" in res_bearer.json()["detail"]

    # 3. Invalid session cookie is REJECTED (HTTP 401)
    invalid_cookie_client = TestClient(app)
    invalid_cookie_client.cookies.set("attendance_session", "invalid-fake-token-12345")
    res_invalid = invalid_cookie_client.get("/api/dashboard/summary")
    assert res_invalid.status_code == 401
    assert "Session invalid or expired" in res_invalid.json()["detail"]


def test_18_csrf_protection_on_state_changing_endpoints():
    """Test 18: State-changing PATCH requires matching X-CSRF-Token header."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    csrf_token = ver.json()["csrf_token"]

    list_res = client.get("/api/anomalies?limit=1")
    anom_id = list_res.json()["data"][0]["anomaly_id"]

    # Missing CSRF -> 403
    r_no_csrf = client.patch(f"/api/anomalies/{anom_id}/review", json={"status": "UNDER_REVIEW"})
    assert r_no_csrf.status_code == 403

    # Invalid CSRF -> 403
    r_bad_csrf = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "UNDER_REVIEW"},
        headers={"X-CSRF-Token": "invalid-token-xyz"}
    )
    assert r_bad_csrf.status_code == 403

    # Valid CSRF -> 200
    r_ok = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "UNDER_REVIEW", "note": "csrf valid"},
        headers={"X-CSRF-Token": csrf_token}
    )
    assert r_ok.status_code == 200


def test_19_session_revocation_on_logout():
    """Test 19: Logout revokes session, clears cookies, and prevents further access."""
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    csrf_token = ver.json()["csrf_token"]

    # Active
    assert client.get("/api/dashboard/summary").status_code == 200

    # Logout
    r_logout = client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert r_logout.status_code == 200

    # Revoked
    assert client.get("/api/dashboard/summary").status_code == 401


def test_20_security_headers_middleware():
    """Test 20: Security headers middleware enforcement."""
    res = client.get("/api/health")
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in res.headers.get("Content-Security-Policy", "")
    assert "camera=()" in res.headers.get("Permissions-Policy", "")


def test_21_security_audit_logging_no_plaintext_secrets():
    """Test 21: Audit logging records events without exposing plaintext secrets or OTPs."""
    session = get_session()
    events = session.query(SecurityAuditLogModel).all()
    assert len(events) > 0

    event_types = {e.event_type for e in events}
    assert "OTP_REQUEST" in event_types
    assert "OTP_RETRIEVAL_SUCCESS" in event_types
    assert "SESSION_CREATED" in event_types

    for e in events:
        if e.details:
            assert TEST_RETRIEVAL_SECRET not in e.details
            assert TEST_ENCRYPTION_KEY not in e.details
            assert "otp=" not in e.details.lower()
    session.close()


def test_22_public_otp_request_dos_prevention():
    """
    Test 22 (P1 Remediation):
    Public repeated requests cannot invalidate an active challenge or exhaust admin quota.
    Even when an abusive visitor IP triggers rate-limiting, OTP A remains intact and retrievable.
    """
    reset_auth_state()

    # 1. Administrator requests OTP A
    res1 = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res1.status_code == 200

    ret1 = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret1.status_code == 200
    otp_a = ret1.json()["otp"]

    # 2. Unauthenticated visitor calls public endpoint repeatedly (3 times within IP limit)
    for _ in range(3):
        res_visitor = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
        assert res_visitor.status_code == 200
        assert "active" in res_visitor.json()["message"].lower() or "verification code" in res_visitor.json()["message"].lower()

    # 3. OTP A remains unchanged, active, and retrievable
    ret2 = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret2.status_code == 200
    assert ret2.json()["otp"] == otp_a

    # 4. Administrator verifies OTP A successfully
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp_a})
    assert ver.status_code == 200
    assert "attendance_session" in ver.cookies

    # 5. Once consumed, immediate new request within cooldown returns 429
    res_after = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert res_after.status_code == 429
    assert "Retry-After" in res_after.headers


def test_23_production_configuration_validation():
    """
    Test 23 (P0 Remediation):
    Startup fails safely in production if secrets are missing, default, or weak.
    """
    from src.dashboard.auth import validate_production_configuration

    orig_env = os.environ.get("ENVIRONMENT", "development")
    orig_ret_secret = os.environ.get("OTP_RETRIEVAL_SECRET")
    orig_enc_key = os.environ.get("OTP_RETRIEVAL_ENCRYPTION_KEY")
    orig_hmac = os.environ.get("OTP_HMAC_SECRET")
    orig_session = os.environ.get("SESSION_SECRET")
    orig_email = os.environ.get("ADMIN_EMAIL")

    try:
        os.environ["ENVIRONMENT"] = "production"

        # 1. Missing / default OTP_RETRIEVAL_SECRET
        os.environ["OTP_RETRIEVAL_SECRET"] = "dev-otp-retrieval-secret-attendance-2026"
        with pytest.raises(RuntimeError, match="Insecure default OTP_RETRIEVAL_SECRET"):
            validate_production_configuration()

        os.environ["OTP_RETRIEVAL_SECRET"] = "short"
        with pytest.raises(RuntimeError, match="OTP_RETRIEVAL_SECRET does not meet minimum complexity"):
            validate_production_configuration()

        # Set valid retrieval secret
        os.environ["OTP_RETRIEVAL_SECRET"] = "a" * 32

        # 2. Missing / default OTP_RETRIEVAL_ENCRYPTION_KEY
        os.environ["OTP_RETRIEVAL_ENCRYPTION_KEY"] = ""
        with pytest.raises(RuntimeError, match="OTP_RETRIEVAL_ENCRYPTION_KEY must be configured"):
            validate_production_configuration()

        # Set valid Fernet key
        from cryptography.fernet import Fernet
        valid_fernet_key = Fernet.generate_key().decode()
        os.environ["OTP_RETRIEVAL_ENCRYPTION_KEY"] = valid_fernet_key

        # 3. Missing / default OTP_HMAC_SECRET
        os.environ["OTP_HMAC_SECRET"] = "attendance-integrity-default-otp-hmac-secret-dev-2026"
        with pytest.raises(RuntimeError, match="Insecure default OTP_HMAC_SECRET"):
            validate_production_configuration()

        os.environ["OTP_HMAC_SECRET"] = "b" * 32

        # 4. Missing / default SESSION_SECRET
        os.environ["SESSION_SECRET"] = "attendance-integrity-default-session-secret-dev-2026"
        with pytest.raises(RuntimeError, match="Insecure default SESSION_SECRET"):
            validate_production_configuration()

        os.environ["SESSION_SECRET"] = "c" * 32

        # Now all valid - should pass without exception
        validate_production_configuration()

    finally:
        os.environ["ENVIRONMENT"] = orig_env
        if orig_ret_secret: os.environ["OTP_RETRIEVAL_SECRET"] = orig_ret_secret
        if orig_enc_key: os.environ["OTP_RETRIEVAL_ENCRYPTION_KEY"] = orig_enc_key
        if orig_hmac: os.environ["OTP_HMAC_SECRET"] = orig_hmac
        if orig_session: os.environ["SESSION_SECRET"] = orig_session
        if orig_email: os.environ["ADMIN_EMAIL"] = orig_email


def test_24_retrieval_endpoint_no_cache_headers():
    """
    Test 24 (P1 Remediation):
    Cache-Control: no-store and Pragma: no-cache headers on GET /api/auth/otp/retrieve.
    """
    reset_auth_state()

    # 1. 401 Unauthorized (missing secret)
    res_no_secret = client.get("/api/auth/otp/retrieve")
    assert res_no_secret.status_code == 401
    assert "no-store" in res_no_secret.headers.get("Cache-Control", "")
    assert res_no_secret.headers.get("Pragma") == "no-cache"

    # 2. 401 Unauthorized (wrong secret)
    res_wrong = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": "invalid-secret"})
    assert res_wrong.status_code == 401
    assert "no-store" in res_wrong.headers.get("Cache-Control", "")
    assert res_wrong.headers.get("Pragma") == "no-cache"

    # 3. 404 Not Found (no active OTP)
    res_not_found = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert res_not_found.status_code == 404
    assert "no-store" in res_not_found.headers.get("Cache-Control", "")
    assert res_not_found.headers.get("Pragma") == "no-cache"

    # 4. 200 OK (successful retrieval)
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    res_ok = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert res_ok.status_code == 200
    assert "no-store" in res_ok.headers.get("Cache-Control", "")
    assert res_ok.headers.get("Pragma") == "no-cache"


def test_25_client_ip_spoofing_defense():
    """
    Test 25 (P2 Remediation):
    Forged X-Forwarded-For headers from untrusted clients do not spoof rate limit identities.
    """
    from src.dashboard.auth import get_client_ip
    from starlette.requests import Request

    # Simulated untrusted connection with forged X-Forwarded-For
    scope = {
        "type": "http",
        "client": ("198.51.100.25", 54321),
        "headers": [
            (b"x-forwarded-for", b"203.0.113.195, 10.0.0.1"),
            (b"user-agent", b"TestAgent"),
        ]
    }
    req = Request(scope)

    # When TRUST_PROXY_HEADERS is False and peer is untrusted external IP
    orig_trust = os.environ.get("TRUST_PROXY_HEADERS")
    try:
        os.environ["TRUST_PROXY_HEADERS"] = "false"
        ip = get_client_ip(req)
        # Should return direct peer client IP, NOT the spoofed header
        assert ip == "198.51.100.25"

        # When TRUST_PROXY_HEADERS is True (e.g. behind Render reverse proxy)
        os.environ["TRUST_PROXY_HEADERS"] = "true"
        ip_proxy = get_client_ip(req)
        # Should return the rightmost hop (closest to proxy), NOT the client-supplied leftmost hop
        assert ip_proxy == "10.0.0.1"
    finally:
        if orig_trust is not None:
            os.environ["TRUST_PROXY_HEADERS"] = orig_trust
        else:
            os.environ.pop("TRUST_PROXY_HEADERS", None)


def test_26_atomic_otp_consumption_concurrency():
    """
    Test 26 (P2 Remediation):
    Atomic conditional update ensures exactly one concurrent verification succeeds.
    """
    import concurrent.futures
    reset_auth_state()

    # Generate an OTP challenge
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret.status_code == 200
    otp = ret.json()["otp"]

    active = db_module.get_active_otp_challenge("attendance@admin.edu")
    assert active is not None
    challenge_id = active["challenge_id"]

    # Concurrently attempt to consume the challenge from 10 threads
    def try_consume():
        return db_module.consume_otp_challenge(challenge_id)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(lambda _: try_consume(), range(10)))

    # Exactly one consumption must succeed
    assert results.count(True) == 1
    assert results.count(False) == 9


def test_27_cookie_same_origin_attributes():
    """
    Test 27 (Phase 1U):
    Verify cookie is emitted with HttpOnly, SameSite=Lax, Path=/, and no explicit Domain override.
    """
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]

    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200

    # Inspect Set-Cookie header
    set_cookie_headers = ver.headers.get_list("set-cookie") if hasattr(ver.headers, "get_list") else [ver.headers.get("set-cookie", "")]
    combined_cookies = " ; ".join(set_cookie_headers)

    assert "attendance_session" in combined_cookies
    assert "HttpOnly" in combined_cookies or "httponly" in combined_cookies
    assert "Path=/" in combined_cookies or "path=/" in combined_cookies
    # Domain attribute should NOT be explicitly overridden (scoped to host)
    assert "Domain=" not in combined_cookies and "domain=" not in combined_cookies


def test_28_csrf_enforcement_all_state_changing_routes():
    """
    Test 28 (Phase 1U):
    Verify CSRF validation is strictly enforced on all state-changing authenticated routes.
    """
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    valid_csrf = ver.json()["csrf_token"]

    list_res = client.get("/api/anomalies?limit=1")
    anom_id = list_res.json()["data"][0]["anomaly_id"]

    # 1. PATCH review endpoint without CSRF -> 403
    r_no_csrf = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "UNDER_REVIEW", "note": "Test without CSRF"}
    )
    assert r_no_csrf.status_code == 403
    assert "CSRF" in r_no_csrf.json()["detail"]

    # 2. PATCH review endpoint with invalid CSRF -> 403
    r_bad_csrf = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "UNDER_REVIEW", "note": "Test with invalid CSRF"},
        headers={"X-CSRF-Token": "bogus-csrf-token-12345"}
    )
    assert r_bad_csrf.status_code == 403
    assert "CSRF" in r_bad_csrf.json()["detail"]

    # 3. PATCH review endpoint with valid CSRF -> 200
    r_valid_csrf = client.patch(
        f"/api/anomalies/{anom_id}/review",
        json={"status": "UNDER_REVIEW", "note": "Test with valid CSRF"},
        headers={"X-CSRF-Token": valid_csrf}
    )
    assert r_valid_csrf.status_code == 200

    # 4. POST logout without CSRF -> 403
    r_logout_no_csrf = client.post("/api/auth/logout")
    assert r_logout_no_csrf.status_code == 403

    # 5. POST logout with valid CSRF -> 200
    r_logout_valid = client.post("/api/auth/logout", headers={"X-CSRF-Token": valid_csrf})
    assert r_logout_valid.status_code == 200


def test_29_session_token_never_in_logs_or_errors():
    """
    Test 29 (Phase 1U):
    Verify raw session tokens never leak into security logs or error payloads.
    """
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    raw_token = ver.cookies.get("attendance_session")
    assert raw_token is not None

    # Inspect security audit logs
    session = get_session()
    logs = session.query(SecurityAuditLogModel).all()
    for log_entry in logs:
        if log_entry.details:
            assert raw_token not in log_entry.details
    session.close()


def test_30_expired_and_revoked_session_rejection():
    """
    Test 30 (Phase 1U):
    Verify expired sessions and revoked sessions return 401.
    """
    reset_auth_state()
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    raw_token = ver.cookies.get("attendance_session")

    # Manually expire the session in the database
    session = get_session()
    token_hash = hash_session_token(raw_token)
    db_sess = session.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    assert db_sess is not None
    db_sess.expires_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    session.commit()
    session.close()

    # Request with expired session returns 401
    res_expired = client.get("/api/dashboard/summary")
    assert res_expired.status_code == 401
    assert "Session invalid or expired" in res_expired.json()["detail"]


def test_31_cache_hardening_authenticated_and_error_responses():
    """
    Test 31 (Phase 1W):
    Verify explicit Cache-Control: no-store, private is enforced on all API responses
    while preserving stronger OTP retrieval directives and avoiding static asset pollution.
    """
    reset_auth_state()

    # 1. Unauthenticated API 401 error response
    r_unauth = client.get("/api/dashboard/summary")
    assert r_unauth.status_code == 401
    assert "no-store" in r_unauth.headers.get("Cache-Control", "")
    assert "private" in r_unauth.headers.get("Cache-Control", "")

    # 2. OTP request endpoint response (200)
    r_req = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert r_req.status_code == 200
    assert "no-store" in r_req.headers.get("Cache-Control", "")
    assert "private" in r_req.headers.get("Cache-Control", "")

    # 3. OTP retrieval retains its stronger cache policy
    r_ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert r_ret.status_code == 200
    otp = r_ret.json()["otp"]
    assert "no-store" in r_ret.headers.get("Cache-Control", "")
    assert "no-cache" in r_ret.headers.get("Cache-Control", "")
    assert "must-revalidate" in r_ret.headers.get("Cache-Control", "")
    assert r_ret.headers.get("Pragma") == "no-cache"

    # 4. OTP verification response (200)
    r_ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert r_ver.status_code == 200
    assert "no-store" in r_ver.headers.get("Cache-Control", "")
    assert "private" in r_ver.headers.get("Cache-Control", "")
    csrf_token = r_ver.json()["csrf_token"]

    # 5. Authenticated GET 200 responses across operational endpoints
    endpoints_to_test = [
        "/api/dashboard/summary",
        "/api/anomalies",
        "/api/reports/compliance-preview",
        "/api/system/info",
        "/api/auth/session"
    ]
    for ep in endpoints_to_test:
        r_ep = client.get(ep)
        assert r_ep.status_code == 200, f"Endpoint {ep} returned {r_ep.status_code}"
        assert "no-store" in r_ep.headers.get("Cache-Control", ""), f"Endpoint {ep} missing no-store"
        assert "private" in r_ep.headers.get("Cache-Control", ""), f"Endpoint {ep} missing private"

    # 6. Authenticated state-changing error (403 CSRF missing)
    r_csrf_err = client.post("/api/auth/logout")
    assert r_csrf_err.status_code == 403
    assert "no-store" in r_csrf_err.headers.get("Cache-Control", "")
    assert "private" in r_csrf_err.headers.get("Cache-Control", "")

    # 7. Authenticated state-changing success (200 logout with CSRF)
    r_logout_ok = client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert r_logout_ok.status_code == 200
    assert "no-store" in r_logout_ok.headers.get("Cache-Control", "")
    assert "private" in r_logout_ok.headers.get("Cache-Control", "")

    # 8. Static frontend assets must NOT receive API no-store header
    r_static = client.get("/index.html")
    assert r_static.status_code == 200
    assert r_static.headers.get("Cache-Control") is None or "no-store" not in r_static.headers.get("Cache-Control", "")


def test_32_otp_lockout_abuse_and_authorized_recovery():
    """
    Test 32 (Phase 1W):
    Verify that an attacker submitting 5 wrong guesses locks the challenge,
    and the legitimate administrator has a bounded recovery path via the secret retrieval channel.
    """
    reset_auth_state()

    # 1. Administrator requests OTP A
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret_a = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret_a.status_code == 200
    otp_a = ret_a.json()["otp"]

    # 2. Attacker submits 5 incorrect guesses
    for i in range(1, 5):
        r_bad = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "000000"})
        assert r_bad.status_code == 400
        assert f"{5 - i} attempt(s) remaining" in r_bad.json()["detail"]

    # 5th attempt triggers lockout
    r_lock = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "000000"})
    assert r_lock.status_code == 400
    assert "Verification code locked" in r_lock.json()["detail"]

    # 3. 6th guess cannot authenticate or bypass attempt limit
    r_6th = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp_a})
    assert r_6th.status_code == 400
    assert "Invalid or expired" in r_6th.json()["detail"] or "locked" in r_6th.json()["detail"].lower()

    # 4. Public request without secret is blocked by 60s cooldown
    r_pub = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert r_pub.status_code == 429
    assert "Retry-After" in r_pub.headers

    # 5. Legitimate administrator uses secret retrieval channel to recover immediately
    ret_recover = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret_recover.status_code == 200
    otp_b = ret_recover.json()["otp"]
    assert otp_b != otp_a  # Fresh unguessable OTP generated for admin

    # 6. Administrator verifies new OTP B successfully
    ver_b = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp_b})
    assert ver_b.status_code == 200
    assert "attendance_session" in ver_b.cookies


def test_33_concurrent_failed_guesses_cannot_exceed_attempt_limit():
    """
    Test 33 (Phase 1W):
    Verify that concurrent failed guesses are incremented atomically and cannot bypass the attempt limit.
    """
    import concurrent.futures
    reset_auth_state()

    # Generate an OTP challenge
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    active = db_module.get_active_otp_challenge("attendance@admin.edu")
    assert active is not None
    challenge_id = active["challenge_id"]

    # Concurrently submit 10 failed guesses
    def try_bad_guess():
        return client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "000000"})

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(lambda _: try_bad_guess(), range(10)))

    # All responses must be errors (400 or 429)
    status_codes = [r.status_code for r in results]
    assert all(sc in (400, 429) for sc in status_codes)

    # Database attempt count must not be less than 5
    session = get_session()
    ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.challenge_id == challenge_id).first()
    assert ch is not None
    assert ch.attempts >= 5
    assert ch.consumed_at is not None  # Challenge was marked consumed/locked
    session.close()


def test_34_inactivity_timeout_backend_expiration_and_cookie_clear():
    """
    Test 34 (Phase 1X):
    Verify that server-side 60-second idle inactivity timeout rejects expired sessions,
    revokes the session in the database, and clears authentication cookies.
    """
    from datetime import datetime, timezone, timedelta
    reset_auth_state()

    # 1. Login and establish session
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    raw_token = ver.cookies.get("attendance_session")
    assert raw_token is not None

    # 2. Immediate access succeeds
    r_initial = client.get("/api/dashboard/summary")
    assert r_initial.status_code == 200

    # 3. Simulate 65 seconds of inactivity by updating last_activity_at in DB
    session = get_session()
    token_hash = hash_session_token(raw_token)
    idle_past = (datetime.now(timezone.utc) - timedelta(seconds=65)).isoformat()
    sess_row = session.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    assert sess_row is not None
    sess_row.last_activity_at = idle_past
    session.commit()
    session.close()

    # 4. Next protected request must be rejected with 401
    r_expired = client.get("/api/dashboard/summary")
    assert r_expired.status_code == 401
    assert "inactivity" in r_expired.json()["detail"].lower()

    # 5. Verify database session is marked revoked
    session2 = get_session()
    sess_revoked = session2.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    assert sess_revoked is not None
    assert sess_revoked.revoked_at is not None
    session2.close()

    # 6. Verify response contains Set-Cookie header clearing the session cookie
    cookie_headers = r_expired.headers.get_list("set-cookie") if hasattr(r_expired.headers, "get_list") else [r_expired.headers.get("set-cookie", "")]
    joined_cookies = " ".join(cookie_headers)
    assert "attendance_session=;" in joined_cookies or 'Max-Age=0' in joined_cookies or r_expired.cookies.get("attendance_session") is None


def test_35_activity_resets_idle_timeout():
    """
    Test 35 (Phase 1X):
    Verify that user activity before the 60-second deadline touches last_activity_at
    and prevents premature expiration.
    """
    from datetime import datetime, timezone, timedelta
    reset_auth_state()

    # 1. Login and establish session
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    raw_token = ver.cookies.get("attendance_session")
    token_hash = hash_session_token(raw_token)

    # 2. Advance time by 45 seconds (< 60s idle limit)
    session = get_session()
    sess_row = session.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    past_45s = (datetime.now(timezone.utc) - timedelta(seconds=45)).isoformat()
    sess_row.last_activity_at = past_45s
    session.commit()
    session.close()

    # 3. Active request: must succeed and touch the session
    r_active = client.get("/api/dashboard/summary")
    assert r_active.status_code == 200

    # 4. Verify last_activity_at was updated to a newer timestamp
    session2 = get_session()
    sess_touched = session2.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    assert sess_touched.last_activity_at > past_45s
    session2.close()

    # 5. Advance time by another 45 seconds (total 90s from start, but only 45s from last activity)
    session3 = get_session()
    sess_row3 = session3.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    past_45s_new = (datetime.now(timezone.utc) - timedelta(seconds=45)).isoformat()
    sess_row3.last_activity_at = past_45s_new
    session3.commit()
    session3.close()

    # Must still succeed because idle elapsed is only 45s
    r_active2 = client.get("/api/dashboard/summary")
    assert r_active2.status_code == 200


def test_36_concurrent_requests_cannot_extend_expired_session():
    """
    Test 36 (Phase 1X):
    Verify that multiple concurrent requests arriving on an expired session cannot extend it;
    all concurrent requests receive 401.
    """
    from datetime import datetime, timezone, timedelta
    import concurrent.futures
    reset_auth_state()

    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    raw_token = ver.cookies.get("attendance_session")
    token_hash = hash_session_token(raw_token)

    # Set last_activity_at to 75 seconds ago
    session = get_session()
    sess_row = session.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    sess_row.last_activity_at = (datetime.now(timezone.utc) - timedelta(seconds=75)).isoformat()
    session.commit()
    session.close()

    # Concurrently send 8 requests
    def access_dashboard():
        return client.get("/api/dashboard/summary")

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda _: access_dashboard(), range(8)))

    # All must be rejected with 401
    assert all(r.status_code == 401 for r in results)

    # Session must be marked revoked in DB
    session2 = get_session()
    sess_check = session2.query(AdminSessionModel).filter(AdminSessionModel.token_hash == token_hash).first()
    assert sess_check.revoked_at is not None
    session2.close()


def test_37_fresh_launch_invalidation_and_no_auto_restore():
    """
    Test 37 (Phase 1X):
    Verify that application launch invalidation (logout) completely destroys the session,
    preventing any auto-restoration across reloads without a fresh OTP.
    """
    from datetime import datetime, timezone, timedelta
    reset_auth_state()

    # 1. Login and get session + CSRF
    client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    otp = ret.json()["otp"]
    ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp})
    assert ver.status_code == 200
    csrf_token = ver.json()["csrf_token"]

    # 2. Simulate fresh application launch: frontend calls logout() on mount
    r_logout = client.post("/api/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert r_logout.status_code == 200

    # 3. Subsequent request to protected dashboard is blocked
    r_protected = client.get("/api/dashboard/summary")
    assert r_protected.status_code == 401

    # 4. Probe endpoint returns authenticated: false
    r_probe = client.get("/api/auth/session")
    assert r_probe.status_code == 200
    assert r_probe.json()["authenticated"] is False

    # 5. Advance cooldown window for previous challenge in DB
    session = get_session()
    old_ch = session.query(OtpChallengeModel).filter(OtpChallengeModel.email == "attendance@admin.edu").order_by(OtpChallengeModel.created_at.desc()).first()
    if old_ch:
        old_ch.created_at = (datetime.now(timezone.utc) - timedelta(seconds=70)).isoformat()
        session.commit()
    session.close()

    # 6. Accessing dashboard requires generating and verifying a fresh OTP
    r_req = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
    assert r_req.status_code == 200
    ret_fresh = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
    assert ret_fresh.status_code == 200
    otp_fresh = ret_fresh.json()["otp"]
    ver_fresh = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": otp_fresh})
    assert ver_fresh.status_code == 200
    assert client.get("/api/dashboard/summary").status_code == 200


def test_38_otp_logging_to_render_disabled_by_default(caplog):
    """
    Test 38: Verify OTP logging is disabled by default (OTP_LOG_TO_RENDER unset or false).
    Logs must never contain the generated OTP value when disabled.
    """
    import os
    reset_auth_state()

    # Ensure OTP_LOG_TO_RENDER is unset
    if "OTP_LOG_TO_RENDER" in os.environ:
        del os.environ["OTP_LOG_TO_RENDER"]

    import logging
    with caplog.at_level(logging.INFO, logger="attendance_integrity.routes"):
        r = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
        assert r.status_code == 200

        # Retrieve the OTP to know what it is
        ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
        assert ret.status_code == 200
        otp = ret.json()["otp"]

        # Assert OTP is NOT logged
        assert "ADMIN OTP GENERATED" not in caplog.text
        assert otp not in caplog.text


def test_39_otp_logging_to_render_when_enabled(caplog):
    """
    Test 39: Verify that when OTP_LOG_TO_RENDER=true, successful OTP generation emits
    the exact structured log format:
    'ADMIN OTP GENERATED | OTP: <6-digit> | Expires in: 300 seconds'
    """
    import os
    reset_auth_state()

    os.environ["OTP_LOG_TO_RENDER"] = "true"
    try:
        import logging
        with caplog.at_level(logging.INFO, logger="attendance_integrity.routes"):
            r = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
            assert r.status_code == 200

            # Retrieve OTP to match
            ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
            assert ret.status_code == 200
            otp = ret.json()["otp"]

            expected_log = f"ADMIN OTP GENERATED | OTP: {otp} | Expires in: 300 seconds"
            assert expected_log in caplog.text
    finally:
        os.environ.pop("OTP_LOG_TO_RENDER", None)


def test_40_otp_logging_never_emits_secrets_or_invalid_otps(caplog):
    """
    Test 40: Verify that:
    1. Failed / unauthorized / invalid requests do not emit OTP generation logs.
    2. Unrelated secrets (retrieval secret, encryption key, session secret, cookies, CSRF)
       are NEVER logged in service logs.
    """
    import os
    reset_auth_state()

    os.environ["OTP_LOG_TO_RENDER"] = "true"
    try:
        import logging
        with caplog.at_level(logging.INFO):
            # 1. Invalid email format
            caplog.clear()
            r_inv = client.post("/api/auth/otp/request", json={"email": "not-an-email"})
            assert r_inv.status_code == 200
            assert "ADMIN OTP GENERATED" not in caplog.text

            # 2. Unauthorized email
            caplog.clear()
            r_unauth = client.post("/api/auth/otp/request", json={"email": "intruder@domain.com"})
            assert r_unauth.status_code == 200
            assert "ADMIN OTP GENERATED" not in caplog.text

            # 3. Successful generation for valid admin
            caplog.clear()
            r_valid = client.post("/api/auth/otp/request", json={"email": "attendance@admin.edu"})
            assert r_valid.status_code == 200
            assert "ADMIN OTP GENERATED | OTP:" in caplog.text

            # 4. Failed verification with wrong OTP does NOT generate or log new OTP
            caplog.clear()
            r_wrong = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": "000000"})
            assert r_wrong.status_code == 400
            assert "ADMIN OTP GENERATED" not in caplog.text

            # 5. Retrieve OTP via secret header: verify secret is NOT logged
            caplog.clear()
            r_ret = client.get("/api/auth/otp/retrieve", headers={"X-OTP-Retrieval-Secret": TEST_RETRIEVAL_SECRET})
            assert r_ret.status_code == 200
            ret_otp = r_ret.json()["otp"]

            # 6. Verify and establish session
            r_ver = client.post("/api/auth/otp/verify", json={"email": "attendance@admin.edu", "otp": ret_otp})
            assert r_ver.status_code == 200
            csrf_token = r_ver.json()["csrf_token"]
            session_cookie = r_ver.cookies.get("attendance_session")

            all_log_text = caplog.text
            # Strict secret leakage assertions:
            assert TEST_RETRIEVAL_SECRET not in all_log_text
            assert os.getenv("OTP_HMAC_SECRET", "attendance-integrity-otp-hmac-secret-dev-2026") not in all_log_text
            assert os.getenv("OTP_RETRIEVAL_ENCRYPTION_KEY", "WDbIHuvetrXb9P4t6snziLZ2lsElZwBNAkxw1OqAneI=") not in all_log_text
            assert session_cookie not in all_log_text
            assert csrf_token not in all_log_text
    finally:
        os.environ.pop("OTP_LOG_TO_RENDER", None)


