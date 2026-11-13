"""
Attendance Integrity System - Authentication & Security Module
File: src/dashboard/auth.py

Implements administrator authentication via server-side OTP generation and
secret-protected retrieval, session management, rate limiting, CSRF verification,
and security audit logging.
"""

import os
import re
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Set, Dict, Any, Tuple

from cryptography.fernet import Fernet, InvalidToken
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials

from src.dashboard.db import (
    save_otp_challenge,
    get_active_otp_challenge,
    get_latest_otp_challenge,
    increment_otp_attempts,
    consume_otp_challenge,
    create_admin_session,
    get_admin_session,
    touch_admin_session,
    revoke_admin_session,
    atomic_check_rate_limit,
    record_security_event,
    _parse_iso
)

logger = logging.getLogger("attendance_integrity.auth")

# Fictional display/authentication identity
DEFAULT_ADMIN_EMAIL = "attendance@admin.edu"

# Dedicated Development Defaults (NEVER permitted in production)
DEV_DEFAULT_RETRIEVAL_SECRET = "dev-otp-retrieval-secret-attendance-2026"
DEV_DEFAULT_HMAC_SECRET = "attendance-integrity-default-otp-hmac-secret-dev-2026"
DEV_DEFAULT_SESSION_SECRET = "attendance-integrity-default-session-secret-dev-2026"
DEV_FALLBACK_ENCRYPTION_KEY = b"WDbIHuvetrXb9P4t6snziLZ2lsElZwBNAkxw1OqAneI="

# Environment & Configuration Loaders
def is_otp_log_to_render_enabled() -> bool:
    """
    Check if OTP logging to service output/Render logs is explicitly enabled.
    Default must be False. Never auto-enabled based on environment detection.
    """
    val = os.getenv("OTP_LOG_TO_RENDER", "false").strip().lower()
    return val in ("true", "1", "yes", "enabled")


def get_otp_hmac_secret() -> str:
    sec = os.getenv("OTP_HMAC_SECRET")
    if sec and sec.strip():
        return sec.strip()
    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    if env_mode == "production":
        raise RuntimeError("CRITICAL: OTP_HMAC_SECRET must be configured in production environment.")
    return DEV_DEFAULT_HMAC_SECRET


def get_session_secret() -> str:
    sec = os.getenv("SESSION_SECRET")
    if sec and sec.strip():
        return sec.strip()
    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    if env_mode == "production":
        raise RuntimeError("CRITICAL: SESSION_SECRET must be configured in production environment.")
    return DEV_DEFAULT_SESSION_SECRET


def validate_production_configuration() -> None:
    """
    Validate that all required security secrets are explicitly configured and cryptographically
    strong when running in production. Never permits development defaults in production.
    Fails safely without logging secret values.
    """
    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    if env_mode != "production":
        return

    # 1. OTP_RETRIEVAL_SECRET
    retrieval_sec = os.getenv("OTP_RETRIEVAL_SECRET")
    if not retrieval_sec or not retrieval_sec.strip():
        raise RuntimeError("CRITICAL: OTP_RETRIEVAL_SECRET must be configured in production environment.")
    if retrieval_sec.strip() == DEV_DEFAULT_RETRIEVAL_SECRET:
        raise RuntimeError("CRITICAL: Insecure default OTP_RETRIEVAL_SECRET cannot be used in production.")
    if len(retrieval_sec.strip()) < 16:
        raise RuntimeError("CRITICAL: OTP_RETRIEVAL_SECRET does not meet minimum complexity requirements (>= 16 characters).")

    # 2. OTP_RETRIEVAL_ENCRYPTION_KEY
    enc_key = os.getenv("OTP_RETRIEVAL_ENCRYPTION_KEY")
    if not enc_key or not enc_key.strip():
        raise RuntimeError("CRITICAL: OTP_RETRIEVAL_ENCRYPTION_KEY must be configured in production environment.")
    if enc_key.strip().encode("utf-8") == DEV_FALLBACK_ENCRYPTION_KEY:
        raise RuntimeError("CRITICAL: Insecure default OTP_RETRIEVAL_ENCRYPTION_KEY cannot be used in production.")
    try:
        Fernet(enc_key.strip().encode("utf-8"))
    except Exception:
        raise RuntimeError("CRITICAL: OTP_RETRIEVAL_ENCRYPTION_KEY is not a valid 32-byte URL-safe base64 Fernet key.")

    # 3. OTP_HMAC_SECRET
    hmac_sec = os.getenv("OTP_HMAC_SECRET")
    if not hmac_sec or not hmac_sec.strip():
        raise RuntimeError("CRITICAL: OTP_HMAC_SECRET must be configured in production environment.")
    if hmac_sec.strip() == DEV_DEFAULT_HMAC_SECRET:
        raise RuntimeError("CRITICAL: Insecure default OTP_HMAC_SECRET cannot be used in production.")
    if len(hmac_sec.strip()) < 16:
        raise RuntimeError("CRITICAL: OTP_HMAC_SECRET does not meet minimum complexity requirements (>= 16 characters).")

    # 4. SESSION_SECRET
    sess_sec = os.getenv("SESSION_SECRET")
    if not sess_sec or not sess_sec.strip():
        raise RuntimeError("CRITICAL: SESSION_SECRET must be configured in production environment.")
    if sess_sec.strip() == DEV_DEFAULT_SESSION_SECRET:
        raise RuntimeError("CRITICAL: Insecure default SESSION_SECRET cannot be used in production.")
    if len(sess_sec.strip()) < 16:
        raise RuntimeError("CRITICAL: SESSION_SECRET does not meet minimum complexity requirements (>= 16 characters).")

    # 5. ADMIN_EMAIL
    admin_email = os.getenv("ADMIN_EMAIL")
    if not admin_email or not admin_email.strip():
        raise RuntimeError("CRITICAL: ADMIN_EMAIL must be explicitly configured in production environment.")

    # 6. COOKIE_SAMESITE
    cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax").lower().strip()
    if cookie_samesite not in ("lax", "strict", "none"):
        raise RuntimeError("CRITICAL: COOKIE_SAMESITE must be 'lax', 'strict', or 'none'.")


# Rate Limiting & Security Configuration
OTP_EXPIRY_SECONDS = 300            # 5 minutes
RESEND_COOLDOWN_SECONDS = 60         # 60 seconds
MAX_OTP_ATTEMPTS = 5                 # 5 invalid attempts locks the challenge
SESSION_EXPIRY_SECONDS = 86400       # 24 hours absolute maximum
SESSION_IDLE_TIMEOUT_SECONDS = 60    # 60 seconds strict inactivity limit

RATE_LIMIT_EMAIL_REQ_MAX = 3
RATE_LIMIT_EMAIL_REQ_WINDOW = 900    # 15 minutes

RATE_LIMIT_IP_REQ_MAX = 5
RATE_LIMIT_IP_REQ_WINDOW = 900       # 15 minutes

RATE_LIMIT_IP_VERIFY_MAX = 15
RATE_LIMIT_IP_VERIFY_WINDOW = 900    # 15 minutes

RATE_LIMIT_RETRIEVAL_IP_MAX = 10
RATE_LIMIT_RETRIEVAL_IP_WINDOW = 300 # 5 minutes


def get_retrieval_fernet() -> Fernet:
    """Initialize Fernet authenticated encryption using server-side key."""
    key = os.getenv("OTP_RETRIEVAL_ENCRYPTION_KEY")
    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    
    if not key or not key.strip():
        if env_mode == "production":
            raise RuntimeError("CRITICAL: OTP_RETRIEVAL_ENCRYPTION_KEY must be configured on Render production environment.")
        key_bytes = DEV_FALLBACK_ENCRYPTION_KEY
    else:
        if env_mode == "production" and key.strip().encode("utf-8") == DEV_FALLBACK_ENCRYPTION_KEY:
            raise RuntimeError("CRITICAL: Insecure default OTP_RETRIEVAL_ENCRYPTION_KEY cannot be used in production.")
        key_bytes = key.strip().encode("utf-8")

    try:
        return Fernet(key_bytes)
    except Exception as e:
        logger.error(f"Failed to initialize Fernet encryption: {e}")
        raise RuntimeError("Invalid OTP_RETRIEVAL_ENCRYPTION_KEY configuration.")


def encrypt_otp_for_retrieval(otp: str) -> str:
    """Encrypt 6-digit OTP using authenticated AES-128-CBC + HMAC-SHA256 (Fernet)."""
    f = get_retrieval_fernet()
    return f.encrypt(otp.encode("utf-8")).decode("utf-8")


def decrypt_otp_for_retrieval(encrypted_otp: str) -> str:
    """Decrypt encrypted OTP for authorized administrator retrieval."""
    f = get_retrieval_fernet()
    try:
        return f.decrypt(encrypted_otp.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        raise ValueError("Failed to decrypt OTP challenge. Invalid encryption token.")


def verify_retrieval_secret(supplied_secret: Optional[str]) -> bool:
    """Verify administrator retrieval secret using constant-time comparison."""
    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    configured_secret = os.getenv("OTP_RETRIEVAL_SECRET")
    
    if not configured_secret or not configured_secret.strip():
        if env_mode == "production":
            logger.error("OTP_RETRIEVAL_SECRET is not configured in production.")
            return False
        configured_secret = DEV_DEFAULT_RETRIEVAL_SECRET

    if env_mode == "production" and configured_secret.strip() == DEV_DEFAULT_RETRIEVAL_SECRET:
        logger.error("Insecure default OTP_RETRIEVAL_SECRET rejected in production.")
        return False

    if not supplied_secret or not supplied_secret.strip():
        return False

    return hmac.compare_digest(supplied_secret.strip(), configured_secret.strip())


def normalize_email(email: Optional[str]) -> str:
    """Trim whitespace and lowercase an email address."""
    if not email:
        return ""
    return email.strip().lower()


def is_valid_email_format(email: str) -> bool:
    """Validate RFC-compliant email format."""
    norm = normalize_email(email)
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, norm))


def get_allowed_admin_emails() -> Set[str]:
    """Retrieve allowed administrator email identities."""
    allowed: Set[str] = set()
    single_admin = os.getenv("ADMIN_EMAIL")
    if single_admin:
        allowed.add(normalize_email(single_admin))
    
    multi_admins = os.getenv("ADMIN_EMAILS")
    if multi_admins:
        for em in multi_admins.split(","):
            norm = normalize_email(em)
            if norm:
                allowed.add(norm)

    # Prototype institutional administrator identity default
    if not allowed:
        allowed.add(DEFAULT_ADMIN_EMAIL)

    return allowed


def is_authorized_admin_email(email: str) -> bool:
    """Check if normalized email matches the authorized administrator identity."""
    norm = normalize_email(email)
    return norm in get_allowed_admin_emails()


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address securely.
    Only trusts proxy headers when TRUST_PROXY_HEADERS is explicitly enabled
    (e.g., in production behind Render's reverse proxy) or when peer is loopback.
    Never trusts client-forged leftmost X-Forwarded-For entries.
    """
    peer_ip = "127.0.0.1"
    if request.client and request.client.host:
        peer_ip = request.client.host

    trust_proxies = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")
    env_mode = os.getenv("ENVIRONMENT", "development").lower()

    if trust_proxies or (env_mode == "production" and peer_ip in ("127.0.0.1", "::1")):
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            hops = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
            if hops:
                # Rightmost hop appended by upstream trusted reverse proxy
                return hops[-1]
        real_ip = request.headers.get("x-real-ip")
        if real_ip and real_ip.strip():
            return real_ip.strip()

    return peer_ip


# Cryptographic Functions
def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP string."""
    return f"{secrets.randbelow(900000) + 100000}"


def hash_otp(email: str, otp: str) -> str:
    """Compute HMAC-SHA256 hex digest of email:otp using server secret."""
    norm_email = normalize_email(email)
    msg = f"{norm_email}:{otp}".encode("utf-8")
    secret = get_otp_hmac_secret()
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def verify_otp_hash(email: str, candidate_otp: str, stored_hash: str) -> bool:
    """Verify candidate OTP against stored hash using constant-time comparison."""
    candidate_hash = hash_otp(email, candidate_otp)
    return hmac.compare_digest(candidate_hash, stored_hash)


def generate_session_token() -> str:
    """Generate high-entropy random URL-safe session token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Hash session token using HMAC-SHA256 for persistent database storage."""
    secret = get_session_secret()
    return hmac.new(secret.encode("utf-8"), token.encode("utf-8"), hashlib.sha256).hexdigest()


def generate_csrf_token() -> str:
    """Generate cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


# Authentication Dependencies
async def get_current_admin(request: Request) -> Dict[str, Any]:
    """
    Authenticate administrator strictly from attendance_session HttpOnly cookie.
    Bearer tokens are rejected to ensure credentials cannot be accessed by JavaScript.
    Enforces absolute session lifetime and strict 60-second inactivity timeout.
    Returns session dict or raises HTTP 401.
    """
    token: Optional[str] = request.cookies.get("attendance_session")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with an authorized administrator account."
        )

    token_hash = hash_session_token(token)
    session = get_admin_session(token_hash)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired. Please sign in again."
        )

    # Enforce strict 60-second inactivity expiration
    last_act_iso = session.get("last_activity_at")
    if last_act_iso:
        last_act_dt = _parse_iso(last_act_iso)
        now_dt = datetime.now(timezone.utc)
        idle_seconds = (now_dt - last_act_dt).total_seconds()
        if idle_seconds > SESSION_IDLE_TIMEOUT_SECONDS:
            # Revoke in database so concurrent / future requests cannot reuse it
            revoke_admin_session(token_hash)
            record_security_event(
                event_type="SESSION_EXPIRED_INACTIVITY",
                email=session.get("email"),
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                status="EXPIRED",
                details=f"Inactivity timeout: idle for {int(idle_seconds)}s (limit {SESSION_IDLE_TIMEOUT_SECONDS}s)"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired due to inactivity. Please verify again."
            )

    # Touch session to record activity for qualifying authenticated request
    touch_admin_session(token_hash)
    session["raw_token"] = token
    return session


async def get_optional_admin(request: Request, touch: bool = False) -> Optional[Dict[str, Any]]:
    """Returns admin session if valid and not idle-expired, or None without raising 401."""
    token: Optional[str] = request.cookies.get("attendance_session")
    if not token:
        return None

    token_hash = hash_session_token(token)
    session = get_admin_session(token_hash)
    if not session:
        return None

    # Check idle timeout
    last_act_iso = session.get("last_activity_at")
    if last_act_iso:
        last_act_dt = _parse_iso(last_act_iso)
        now_dt = datetime.now(timezone.utc)
        idle_seconds = (now_dt - last_act_dt).total_seconds()
        if idle_seconds > SESSION_IDLE_TIMEOUT_SECONDS:
            revoke_admin_session(token_hash)
            return None

    if touch:
        touch_admin_session(token_hash)

    session["raw_token"] = token
    return session


def validate_csrf_token(request: Request, admin: Dict[str, Any]) -> None:
    """
    Validate CSRF token on state-changing requests.
    Expects X-CSRF-Token header matching the session's csrf_token.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        header_csrf = request.headers.get("x-csrf-token")
        if not header_csrf:
            record_security_event(
                event_type="CSRF_VIOLATION",
                email=admin.get("email"),
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                status="BLOCKED",
                details="Missing X-CSRF-Token header"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Missing header."
            )
        
        expected_csrf = admin.get("csrf_token", "")
        if not hmac.compare_digest(header_csrf, expected_csrf):
            record_security_event(
                event_type="CSRF_VIOLATION",
                email=admin.get("email"),
                ip_address=get_client_ip(request),
                user_agent=request.headers.get("user-agent"),
                status="BLOCKED",
                details="Mismatched X-CSRF-Token header"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token validation failed. Invalid token."
            )
