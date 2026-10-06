"""
Attendance Integrity System - Combined Decision Engine
File: src/anomaly/scoring.py

Combines deterministic rule evidence (R001-R008) and machine learning anomaly scores (Isolation Forest)
into a unified, interpretable risk tier classification policy.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

RISK_TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL"]


def determine_combined_risk(
    record_rules: List[Dict[str, Any]],
    ml_flag: bool,
    anomaly_score: float
) -> Dict[str, Any]:
    """
    Interpretable Decision Policy:
    
    1. CRITICAL:
       Triggered by any deterministic DATA_INTEGRITY rule (R001, R002, R003, R004).
       Reason: Record is structurally invalid, duplicated, conflicting, or missing.
       
    2. HIGH:
       Triggered if multiple behavioral rules triggered (>= 2 rules)
       OR if ML flag is True AND at least 1 behavioral rule triggered.
       
    3. MEDIUM:
       Triggered if exactly 1 behavioral rule triggered (R005, R006, R007, R008)
       OR if ML flag is True without rule evidence.
       
    4. LOW:
       Triggered if anomaly_score >= 0.70 (borderline ML score) without any rule evidence.
       
    5. NORMAL:
       No rule evidence and anomaly_score < 0.70.
    """
    has_data_integrity = any(r["rule_category"] == "DATA_INTEGRITY" for r in record_rules)
    behavioral_rules = [r for r in record_rules if r["rule_category"] != "DATA_INTEGRITY"]
    num_behavioral = len(behavioral_rules)

    if has_data_integrity:
        risk_level = "CRITICAL"
        recommendation = "Immediate administrative correction required (data integrity fault)"
        is_anomaly = True
    elif num_behavioral >= 2 or (ml_flag and num_behavioral >= 1):
        risk_level = "HIGH"
        recommendation = "Review recommended: Multiple anomaly indicators detected"
        is_anomaly = True
    elif num_behavioral == 1 or ml_flag:
        risk_level = "MEDIUM"
        recommendation = "Review recommended: Moderate anomaly indicator detected"
        is_anomaly = True
    elif anomaly_score >= 0.70:
        risk_level = "LOW"
        recommendation = "Low priority monitoring: Borderline statistical variance"
        is_anomaly = False
    else:
        risk_level = "NORMAL"
        recommendation = "No review required: Normal attendance pattern"
        is_anomaly = False

    return {
        "risk_level": risk_level,
        "combined_flag": is_anomaly,
        "recommendation": recommendation,
        "rules_triggered_count": len(record_rules),
        "data_integrity_rules": [r["rule_id"] for r in record_rules if r["rule_category"] == "DATA_INTEGRITY"],
        "behavioral_rules": [r["rule_id"] for r in behavioral_rules],
        "ml_flag": ml_flag,
        "anomaly_score": anomaly_score
    }


def compute_combined_scoring(
    rule_evidence_df: pd.DataFrame,
    ml_predictions_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Combine rule evidence dataframe and ML predictions dataframe into unified decision dataframe.
    """
    # Group rule evidence by record_id
    rules_by_record: Dict[str, List[Dict[str, Any]]] = {}
    if not rule_evidence_df.empty:
        for _, row in rule_evidence_df.iterrows():
            rec_id = row["record_id"]
            if rec_id not in rules_by_record:
                rules_by_record[rec_id] = []
            rules_by_record[rec_id].append(row.to_dict())

    # Build output records for all ML prediction rows
    combined_rows = []
    
    # Track which record IDs were processed from ML predictions
    ml_record_ids = set(ml_predictions_df["record_id"])

    for _, ml_row in ml_predictions_df.iterrows():
        rec_id = ml_row["record_id"]
        rec_rules = rules_by_record.get(rec_id, [])
        ml_flag = bool(ml_row["ml_flag"])
        anom_score = float(ml_row["anomaly_score"])

        decision = determine_combined_risk(rec_rules, ml_flag, anom_score)

        combined_rows.append({
            "record_id": rec_id,
            "student_id": ml_row["student_id"],
            "date": ml_row["date"],
            "ml_anomaly_score": anom_score,
            "ml_flag": ml_flag,
            "rule_count": len(rec_rules),
            "rules_triggered": ", ".join([r["rule_id"] for r in rec_rules]) if rec_rules else "NONE",
            "risk_level": decision["risk_level"],
            "combined_flag": decision["combined_flag"],
            "recommendation": decision["recommendation"]
        })

    # Add missing expected records (which exist in rules_by_record but not in ML predictions)
    for rec_id, r_list in rules_by_record.items():
        if rec_id not in ml_record_ids:
            decision = determine_combined_risk(r_list, ml_flag=False, anomaly_score=1.0)
            combined_rows.append({
                "record_id": rec_id,
                "student_id": r_list[0]["student_id"],
                "date": r_list[0]["date"],
                "ml_anomaly_score": 1.0,
                "ml_flag": False,
                "rule_count": len(r_list),
                "rules_triggered": ", ".join([r["rule_id"] for r in r_list]),
                "risk_level": decision["risk_level"],
                "combined_flag": decision["combined_flag"],
                "recommendation": decision["recommendation"]
            })

    return pd.DataFrame(combined_rows)
