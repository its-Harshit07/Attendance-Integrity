"""
Attendance Integrity System - Deterministic Demo Data Seeding Script
File: scripts/seed_demo_data.py

Populates operational database (PostgreSQL or local DB) with Phase 4 demonstration
signals while protecting ground-truth target labels and injection metadata.
"""

import os
import sys
import logging
from datetime import datetime, timezone
import pandas as pd

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.dashboard.db import (
    init_db, get_session, get_db_url,
    AnomalyModel, EvidenceModel, AuditLogModel
)
from src.anomaly.rule_engine import RuleEngine
from src.anomaly.detector import AttendanceAnomalyDetector
from src.anomaly.scoring import compute_combined_scoring

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("seed_demo_data")

CONTAM_EVAL_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "contaminated_evaluation.csv")
TEST_FEAT_PATH = os.path.join(BASE_DIR, "data", "ml", "test.csv")
EXPECTED_OBS_PATH = os.path.join(BASE_DIR, "data", "processed", "expected_observations.csv")
STUDENT_MASTER_PATH = os.path.join(BASE_DIR, "data", "processed", "student_master.csv")


def seed_demo_data(target_url: str = None) -> tuple:
    """Seed target operational database deterministically from Phase 4 outputs."""
    db_url = target_url or get_db_url()
    logger.info(f"Seeding demo database target: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    init_db()

    # Load student master names map
    stu_name_map = {}
    if os.path.isfile(STUDENT_MASTER_PATH):
        sm_df = pd.read_csv(STUDENT_MASTER_PATH)
        stu_name_map = dict(zip(sm_df["student_id"], sm_df["student_name_anonymized"]))

    # Load Phase 4 datasets
    df_contam = pd.read_csv(CONTAM_EVAL_PATH)
    df_test_feat = pd.read_csv(TEST_FEAT_PATH)
    df_expected = pd.read_csv(EXPECTED_OBS_PATH)

    nov_record_ids = set(df_test_feat["record_id"]).union(
        set(df_expected[df_expected["date"].str.startswith("2025-11")]["record_id"])
    )

    df_contam_nov = df_contam[df_contam["record_id"].isin(nov_record_ids)].copy()
    df_expected_nov = df_expected[df_expected["record_id"].isin(nov_record_ids)].copy()

    # Detection Engines
    engine = RuleEngine()
    rule_evidence = engine.run_all_rules(df_contam_nov, df_test_feat, df_expected_nov)

    detector = AttendanceAnomalyDetector(random_state=42)
    detector.train(pd.read_csv(os.path.join(BASE_DIR, "data", "ml", "train.csv")))
    detector.calibrate_threshold(pd.read_csv(os.path.join(BASE_DIR, "data", "ml", "validation.csv")))
    ml_preds = detector.predict(df_test_feat)

    combined_scoring_df = compute_combined_scoring(rule_evidence, ml_preds)

    # Group evidence by record_id
    evidence_by_record = {}
    if not rule_evidence.empty:
        for _, r in rule_evidence.iterrows():
            rec_id = r["record_id"]
            if rec_id not in evidence_by_record:
                evidence_by_record[rec_id] = []
            evidence_by_record[rec_id].append(r.to_dict())

    # Map raw/canonical fields from df_contam_nov
    contam_map = {}
    for _, r in df_contam_nov.iterrows():
        contam_map[r["record_id"]] = r.to_dict()

    session = get_session()
    try:
        # Clear existing operational tables for idempotent seeding
        session.query(EvidenceModel).delete()
        session.query(AnomalyModel).delete()
        session.query(AuditLogModel).delete()
        session.commit()

        now_iso = datetime.now(timezone.utc).isoformat()
        inserted_anom_count = 0
        inserted_ev_count = 0

        for idx, row in combined_scoring_df.iterrows():
            rec_id = row["record_id"]
            if row["risk_level"] == "NORMAL" and row["rule_count"] == 0:
                continue

            anom_id = f"ANOM_{inserted_anom_count + 1:04d}"
            stu_id = row["student_id"]
            stu_name = stu_name_map.get(stu_id, f"Student {stu_id}")

            c_info = contam_map.get(rec_id, {})
            att_status = c_info.get("attendance_status", "ABSENT_MISSING" if row["rules_triggered"] == "R003" else "NO_EXCEPTION_RECORDED")
            raw_status = c_info.get("raw_status", "N/A")
            class_id = c_info.get("class_id", "Kls 8")

            r_list = evidence_by_record.get(rec_id, [])
            if r_list:
                anom_cat = r_list[0]["rule_category"]
            elif row["ml_flag"]:
                anom_cat = "BEHAVIORAL_SPIKE"
            else:
                anom_cat = "PERSONAL_DEVIATION"

            det_source = "COMBINED" if (r_list and row["ml_flag"]) else ("RULES" if r_list else "ML")

            anom_entry = AnomalyModel(
                anomaly_id=anom_id,
                record_id=rec_id,
                student_id=stu_id,
                student_name=stu_name,
                class_id=class_id,
                date=row["date"],
                attendance_status=att_status,
                raw_status=raw_status,
                anomaly_category=anom_cat,
                detection_source=det_source,
                risk_tier=row["risk_level"],
                anomaly_score=float(row["ml_anomaly_score"]),
                review_status="UNREVIEWED",
                created_at=now_iso,
                updated_at=now_iso
            )
            session.add(anom_entry)
            inserted_anom_count += 1

            if r_list:
                for ev in r_list:
                    ev_entry = EvidenceModel(
                        anomaly_id=anom_id,
                        rule_id=ev["rule_id"],
                        rule_name=ev["rule_category"],
                        category=ev["rule_category"],
                        severity=ev["severity"],
                        observed_value=str(ev.get("observed_value", "N/A")),
                        threshold_value=str(ev.get("threshold", "N/A")),
                        expected_value="Normal Baseline",
                        explanation=ev["explanation"]
                    )
                    session.add(ev_entry)
                    inserted_ev_count += 1

            if row["ml_flag"] and not r_list:
                ev_entry = EvidenceModel(
                    anomaly_id=anom_id,
                    rule_id="ML_ISOLATION_FOREST",
                    rule_name="Isolation Forest Detector",
                    category="BEHAVIORAL_SPIKE",
                    severity="MEDIUM",
                    observed_value=f"Score: {row['ml_anomaly_score']:.4f}",
                    threshold_value=f"Threshold: {detector.operating_threshold_raw:.4f}",
                    expected_value="Clean Baseline",
                    explanation=f"Multivariate temporal exception feature pattern score ({row['ml_anomaly_score']:.2f}) exceeded calibrated operating threshold."
                )
                session.add(ev_entry)
                inserted_ev_count += 1

        # Initial System Audit Log Entry
        system_audit = AuditLogModel(
            anomaly_id="SYSTEM",
            action="DATABASE_INITIALIZATION",
            previous_status="NONE",
            new_status="UNREVIEWED",
            reviewer="System Pipeline",
            note="Ingested Phase 4 evaluation dataset into operational dashboard database.",
            timestamp=now_iso
        )
        session.add(system_audit)
        session.commit()

        logger.info(f"Database seeded successfully: {inserted_anom_count} anomalies, {inserted_ev_count} evidence entries.")
        return inserted_anom_count, inserted_ev_count
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
        raise e
    finally:
        session.close()


def main():
    seed_demo_data()


if __name__ == "__main__":
    main()
