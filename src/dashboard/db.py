"""
Attendance Integrity System - Dashboard Database Abstraction Layer
File: src/dashboard/db.py

Provides SQLAlchemy 2.x ORM models, migration support, and database operations
for PostgreSQL (production) and SQLite (local test / fallback environments).
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, String, Float, Integer, Text, ForeignKey,
    func, select, update, delete, or_, desc, asc, case, text, inspect
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from sqlalchemy.pool import NullPool, QueuePool

load_dotenv()

logger = logging.getLogger("attendance_integrity.db")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "data", "dashboard.db")
DB_PATH = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)

Base = declarative_base()


# ORM Model Definitions
class AnomalyModel(Base):
    __tablename__ = "anomalies"

    anomaly_id = Column(String, primary_key=True)
    record_id = Column(String, unique=True, nullable=False)
    student_id = Column(String, nullable=False, index=True)
    student_name = Column(String, nullable=True)
    class_id = Column(String, nullable=False)
    date = Column(String, nullable=False, index=True)
    attendance_status = Column(String, nullable=True)
    raw_status = Column(String, nullable=True)
    anomaly_category = Column(String, nullable=False, index=True)
    detection_source = Column(String, nullable=False, index=True)
    risk_tier = Column(String, nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    review_status = Column(String, nullable=False, default="UNREVIEWED", index=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    evidence_items = relationship("EvidenceModel", back_populates="anomaly", cascade="all, delete-orphan")
    review_items = relationship("ReviewModel", back_populates="anomaly", cascade="all, delete-orphan")


class EvidenceModel(Base):
    __tablename__ = "evidence"

    evidence_id = Column(Integer, primary_key=True, autoincrement=True)
    anomaly_id = Column(String, ForeignKey("anomalies.anomaly_id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String, nullable=False)
    rule_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    observed_value = Column(String, nullable=True)
    threshold_value = Column(String, nullable=True)
    expected_value = Column(String, nullable=True)
    explanation = Column(Text, nullable=False)

    anomaly = relationship("AnomalyModel", back_populates="evidence_items")


class ReviewModel(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, autoincrement=True)
    anomaly_id = Column(String, ForeignKey("anomalies.anomaly_id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer = Column(String, nullable=False)
    previous_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    timestamp = Column(String, nullable=False)

    anomaly = relationship("AnomalyModel", back_populates="review_items")


class AuditLogModel(Base):
    __tablename__ = "audit_log"

    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    anomaly_id = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    reviewer = Column(String, nullable=False)
    note = Column(Text, nullable=True)
    timestamp = Column(String, nullable=False)


def normalize_db_url(url: Optional[str]) -> str:
    """Normalize PostgreSQL connection string for SQLAlchemy 2.x + psycopg 3."""
    if not url:
        return ""
    url = url.strip()
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def get_db_url() -> str:
    """Determine operational database URL (PostgreSQL DATABASE_URL or SQLite DB_PATH)."""
    raw_env_url = os.getenv("DATABASE_URL")
    if raw_env_url and raw_env_url.strip():
        return normalize_db_url(raw_env_url)
    
    # Check test database URL if set during automated testing
    test_url = os.getenv("TEST_DATABASE_URL")
    if test_url and test_url.strip():
        return normalize_db_url(test_url)
    
    # Fallback to SQLite using DB_PATH
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    return f"sqlite:///{DB_PATH}"


_engine = None
_SessionFactory = None


def get_engine():
    """Create or retrieve active SQLAlchemy engine."""
    global _engine, _SessionFactory
    url = get_db_url()
    
    if _engine is None or str(_engine.url) != url:
        kwargs = {}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs["pool_pre_ping"] = True
            kwargs["pool_size"] = 10
            kwargs["max_overflow"] = 20
        
        _engine = create_engine(url, **kwargs)
        _SessionFactory = sessionmaker(bind=_engine, expire_on_commit=False)
        logger.info(f"Database engine initialized: {url.split('@')[-1] if '@' in url else url}")
    
    return _engine


def get_session() -> Session:
    """Obtain a new SQLAlchemy session."""
    get_engine()
    return _SessionFactory()


class DictRow:
    """Wrapper for backward compatibility with sqlite3.Row dict-like access."""
    def __init__(self, data: dict):
        self._data = data

    def __getitem__(self, item):
        return self._data[item]

    def keys(self):
        return self._data.keys()

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __iter__(self):
        return iter(self._data)


class LegacyDbConnection:
    """Legacy DB connection wrapper for tests and raw script interactions."""
    def __init__(self, session: Session):
        self.session = session
        self.conn = session.connection()

    def cursor(self):
        return self

    def execute(self, sql: str, params=()):
        formatted_sql = sql
        dict_params = {}
        if params:
            if isinstance(params, (list, tuple)):
                p_idx = 1
                while "?" in formatted_sql:
                    formatted_sql = formatted_sql.replace("?", f":p{p_idx}", 1)
                    p_idx += 1
                dict_params = {f"p{i+1}": p for i, p in enumerate(params)}
            elif isinstance(params, dict):
                dict_params = params

        res = self.conn.execute(text(formatted_sql), dict_params)
        if res.returns_rows:
            self._rows = [DictRow(dict(r._mapping)) for r in res.fetchall()]
        else:
            self._rows = []
        return self

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows

    def commit(self):
        self.session.commit()

    def close(self):
        self.session.close()


def get_db_connection():
    """Create and return database connection (compatible with legacy callers)."""
    session = get_session()
    return LegacyDbConnection(session)


def init_db():
    """Initialize database tables using SQLAlchemy Base metadata."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified / initialized.")


def get_dashboard_summary() -> Dict[str, Any]:
    """Retrieve aggregate overview counter metrics for the dashboard."""
    session = get_session()
    try:
        total = session.query(func.count(AnomalyModel.anomaly_id)).scalar() or 0

        # Status counts
        status_q = session.query(AnomalyModel.review_status, func.count(AnomalyModel.anomaly_id)).group_by(AnomalyModel.review_status).all()
        status_counts = {status: cnt for status, cnt in status_q}

        # Risk tier counts
        risk_q = session.query(AnomalyModel.risk_tier, func.count(AnomalyModel.anomaly_id)).group_by(AnomalyModel.risk_tier).all()
        risk_counts = {risk: cnt for risk, cnt in risk_q}

        # Category breakdown
        integrity_cats = ('DUPLICATE', 'CONFLICT', 'MISSING_RECORD', 'INVALID_RECORD')
        integrity_count = session.query(func.count(AnomalyModel.anomaly_id)).filter(AnomalyModel.anomaly_category.in_(integrity_cats)).scalar() or 0
        behavioral_count = total - integrity_count

        # Source counts
        source_q = session.query(AnomalyModel.detection_source, func.count(AnomalyModel.anomaly_id)).group_by(AnomalyModel.detection_source).all()
        source_counts = {src: cnt for src, cnt in source_q}

        return {
            "total_anomalies": total,
            "unreviewed_count": status_counts.get("UNREVIEWED", 0),
            "under_review_count": status_counts.get("UNDER_REVIEW", 0),
            "validated_count": status_counts.get("VALIDATED", 0),
            "rejected_count": status_counts.get("REJECTED", 0),
            "investigate_count": status_counts.get("INVESTIGATE", 0),
            "critical_risk_count": risk_counts.get("CRITICAL", 0),
            "high_risk_count": risk_counts.get("HIGH", 0),
            "medium_risk_count": risk_counts.get("MEDIUM", 0),
            "low_risk_count": risk_counts.get("LOW", 0),
            "data_integrity_count": integrity_count,
            "behavioral_count": behavioral_count,
            "rules_detected": source_counts.get("RULES", 0),
            "ml_detected": source_counts.get("ML", 0),
            "combined_detected": source_counts.get("COMBINED", 0)
        }
    finally:
        session.close()


def list_anomalies(
    status: Optional[str] = None,
    risk: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_dir: str = "DESC",
    limit: int = 100,
    offset: int = 0
) -> Tuple[List[Dict[str, Any]], int]:
    """Filter and list anomalies for the queue table with pagination."""
    session = get_session()
    try:
        query = session.query(AnomalyModel)

        if status and status.upper() != "ALL":
            query = query.filter(AnomalyModel.review_status == status.upper())

        if risk and risk.upper() != "ALL":
            query = query.filter(AnomalyModel.risk_tier == risk.upper())

        if category and category.upper() != "ALL":
            if category.upper() == "DATA_INTEGRITY":
                query = query.filter(AnomalyModel.anomaly_category.in_(['DUPLICATE', 'CONFLICT', 'MISSING_RECORD', 'INVALID_RECORD']))
            elif category.upper() == "BEHAVIORAL":
                query = query.filter(AnomalyModel.anomaly_category.in_(['BEHAVIORAL_SPIKE', 'EXCEPTION_STREAK', 'PERSONAL_DEVIATION', 'CLASS_DEVIATION']))
            else:
                query = query.filter(AnomalyModel.anomaly_category == category.upper())

        if source and source.upper() != "ALL":
            query = query.filter(AnomalyModel.detection_source == source.upper())

        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    AnomalyModel.student_id.like(term),
                    AnomalyModel.student_name.like(term),
                    AnomalyModel.class_id.like(term),
                    AnomalyModel.date.like(term),
                    AnomalyModel.anomaly_category.like(term)
                )
            )

        total_count = query.count()

        # Sorting logic
        if sort_by.lower() == "score":
            sort_attr = AnomalyModel.anomaly_score
        elif sort_by.lower() == "student":
            sort_attr = AnomalyModel.student_id
        elif sort_by.lower() == "status":
            sort_attr = AnomalyModel.review_status
        elif sort_by.lower() == "risk":
            sort_attr = case(
                (AnomalyModel.risk_tier == 'CRITICAL', 1),
                (AnomalyModel.risk_tier == 'HIGH', 2),
                (AnomalyModel.risk_tier == 'MEDIUM', 3),
                (AnomalyModel.risk_tier == 'LOW', 4),
                else_=5
            )
        else:
            sort_attr = AnomalyModel.date

        if sort_dir.upper() == "ASC":
            query = query.order_by(asc(sort_attr))
        else:
            query = query.order_by(desc(sort_attr))

        rows = query.limit(limit).offset(offset).all()

        anom_dicts = []
        for r in rows:
            anom_dicts.append({
                "anomaly_id": r.anomaly_id,
                "record_id": r.record_id,
                "student_id": r.student_id,
                "student_name": r.student_name,
                "class_id": r.class_id,
                "date": r.date,
                "attendance_status": r.attendance_status,
                "raw_status": r.raw_status,
                "anomaly_category": r.anomaly_category,
                "detection_source": r.detection_source,
                "risk_tier": r.risk_tier,
                "anomaly_score": r.anomaly_score,
                "review_status": r.review_status,
                "created_at": r.created_at,
                "updated_at": r.updated_at
            })

        return anom_dicts, total_count
    finally:
        session.close()


def get_anomaly_detail(anomaly_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve full anomaly detail including evidence items and review history."""
    session = get_session()
    try:
        anom = session.query(AnomalyModel).filter(
            or_(AnomalyModel.anomaly_id == anomaly_id, AnomalyModel.record_id == anomaly_id)
        ).first()

        if not anom:
            return None

        evidence_rows = session.query(EvidenceModel).filter(EvidenceModel.anomaly_id == anom.anomaly_id).all()
        review_rows = session.query(ReviewModel).filter(ReviewModel.anomaly_id == anom.anomaly_id).order_by(desc(ReviewModel.timestamp)).all()

        ev_dicts = [{
            "evidence_id": ev.evidence_id,
            "anomaly_id": ev.anomaly_id,
            "rule_id": ev.rule_id,
            "rule_name": ev.rule_name,
            "category": ev.category,
            "severity": ev.severity,
            "observed_value": ev.observed_value,
            "threshold_value": ev.threshold_value,
            "expected_value": ev.expected_value,
            "explanation": ev.explanation
        } for ev in evidence_rows]

        rev_dicts = [{
            "review_id": rev.review_id,
            "anomaly_id": rev.anomaly_id,
            "reviewer": rev.reviewer,
            "previous_status": rev.previous_status,
            "new_status": rev.new_status,
            "note": rev.note,
            "timestamp": rev.timestamp
        } for rev in review_rows]

        return {
            "anomaly_id": anom.anomaly_id,
            "record_id": anom.record_id,
            "student_id": anom.student_id,
            "student_name": anom.student_name,
            "class_id": anom.class_id,
            "date": anom.date,
            "attendance_status": anom.attendance_status,
            "raw_status": anom.raw_status,
            "anomaly_category": anom.anomaly_category,
            "detection_source": anom.detection_source,
            "risk_tier": anom.risk_tier,
            "anomaly_score": anom.anomaly_score,
            "review_status": anom.review_status,
            "created_at": anom.created_at,
            "updated_at": anom.updated_at,
            "evidence": ev_dicts,
            "review_history": rev_dicts
        }
    finally:
        session.close()


def update_anomaly_review(
    anomaly_id: str,
    new_status: str,
    note: str,
    reviewer: str = "Administrator (Dev)"
) -> Optional[Dict[str, Any]]:
    """Update review status of an anomaly and append audit trail log."""
    valid_statuses = {"UNREVIEWED", "UNDER_REVIEW", "VALIDATED", "REJECTED", "INVESTIGATE"}
    if new_status.upper() not in valid_statuses:
        raise ValueError(f"Invalid review status: '{new_status}'")

    session = get_session()
    try:
        anom = session.query(AnomalyModel).filter(
            or_(AnomalyModel.anomaly_id == anomaly_id, AnomalyModel.record_id == anomaly_id)
        ).first()

        if not anom:
            return None

        prev_status = anom.review_status
        anom_id = anom.anomaly_id
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update anomaly review status
        anom.review_status = new_status.upper()
        anom.updated_at = now_iso

        # Insert Review record
        review_entry = ReviewModel(
            anomaly_id=anom_id,
            reviewer=reviewer,
            previous_status=prev_status,
            new_status=new_status.upper(),
            note=note,
            timestamp=now_iso
        )
        session.add(review_entry)

        # Insert Audit Log entry
        audit_entry = AuditLogModel(
            anomaly_id=anom_id,
            action="REVIEW_STATUS_UPDATE",
            previous_status=prev_status,
            new_status=new_status.upper(),
            reviewer=reviewer,
            note=note,
            timestamp=now_iso
        )
        session.add(audit_entry)

        session.commit()

        return {
            "anomaly_id": anom.anomaly_id,
            "record_id": anom.record_id,
            "student_id": anom.student_id,
            "student_name": anom.student_name,
            "class_id": anom.class_id,
            "date": anom.date,
            "attendance_status": anom.attendance_status,
            "raw_status": anom.raw_status,
            "anomaly_category": anom.anomaly_category,
            "detection_source": anom.detection_source,
            "risk_tier": anom.risk_tier,
            "anomaly_score": anom.anomaly_score,
            "review_status": anom.review_status,
            "created_at": anom.created_at,
            "updated_at": anom.updated_at
        }
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def get_audit_log_by_anomaly_id(anomaly_id: str) -> List[Dict[str, Any]]:
    """Retrieve audit trail entries for a specific anomaly or system action."""
    session = get_session()
    try:
        audit_rows = session.query(AuditLogModel).filter(AuditLogModel.anomaly_id == anomaly_id).order_by(desc(AuditLogModel.timestamp)).all()
        return [{
            "audit_id": a.audit_id,
            "anomaly_id": a.anomaly_id,
            "action": a.action,
            "previous_status": a.previous_status,
            "new_status": a.new_status,
            "reviewer": a.reviewer,
            "note": a.note,
            "timestamp": a.timestamp
        } for a in audit_rows]
    finally:
        session.close()
