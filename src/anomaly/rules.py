"""
Attendance Integrity System - Production Rules Implementation
File: src/anomaly/rules.py

Contains rule functions R001-R008 for deterministic anomaly detection.
Each rule returns structured evidence for administrator review.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from src.anomaly.rule_config import RULE_CONFIG


def evaluate_r001_duplicate(df: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R001 - DUPLICATE: Detect if same (student_id, date) appears multiple times.
    """
    cfg = config or RULE_CONFIG["R001"]
    evidence_list = []
    
    # Identify duplicate groups
    dup_counts = df.groupby(["student_id", "date"]).size()
    dup_groups = dup_counts[dup_counts > 1].reset_index()
    
    if dup_groups.empty:
        return evidence_list
        
    dup_set = set(zip(dup_groups["student_id"], dup_groups["date"]))
    
    for _, row in df.iterrows():
        key = (row["student_id"], row["date"])
        if key in dup_set:
            count = dup_counts.loc[key]
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"Duplicate record detected: student/date appears {count} times",
                "threshold": 1,
                "observed_value": count,
                "explanation": f"Student {row['student_id']} on {row['date']} has {count} duplicate attendance entries."
            })
            
    return evidence_list


def evaluate_r002_conflict(df: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R002 - CONFLICT: Detect if same (student_id, date) has incompatible status observations.
    """
    cfg = config or RULE_CONFIG["R002"]
    evidence_list = []
    
    status_counts = df.groupby(["student_id", "date"])["attendance_status"].nunique()
    conflict_groups = status_counts[status_counts > 1].reset_index()
    
    if conflict_groups.empty:
        return evidence_list
        
    conflict_set = set(zip(conflict_groups["student_id"], conflict_groups["date"]))
    
    for _, row in df.iterrows():
        key = (row["student_id"], row["date"])
        if key in conflict_set:
            distinct_statuses = df[(df["student_id"] == row["student_id"]) & (df["date"] == row["date"])]["attendance_status"].unique().tolist()
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"Conflicting attendance status observations: {distinct_statuses}",
                "threshold": 1,
                "observed_value": len(distinct_statuses),
                "explanation": f"Student {row['student_id']} on {row['date']} has incompatible status marks: {', '.join(distinct_statuses)}."
            })
            
    return evidence_list


def evaluate_r003_missing_expected(df_eval: pd.DataFrame, df_expected_obs: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R003 - MISSING EXPECTED RECORD: Trigger when expected_observation == True but record is absent from evaluated dataset.
    Never trigger for UNKNOWN calendar dates, weekends, or post-roster-disappearance dates.
    """
    cfg = config or RULE_CONFIG["R003"]
    evidence_list = []
    
    # Filter expected observations to true school opportunities
    valid_exp = df_expected_obs[
        (df_expected_obs["expected_observation"].fillna(False).astype(str).str.upper() == "TRUE")
    ].copy()
    
    # Set of present (student_id, date) in evaluated dataset
    eval_set = set(zip(df_eval["student_id"], df_eval["date"]))
    
    for _, exp_row in valid_exp.iterrows():
        key = (exp_row["student_id"], exp_row["date"])
        if key not in eval_set:
            rec_id = exp_row["record_id"] if ("record_id" in exp_row and pd.notna(exp_row["record_id"])) else f"MISSING_{exp_row['student_id']}_{exp_row['date']}"
            evidence_list.append({
                "record_id": rec_id,
                "student_id": exp_row["student_id"],
                "date": exp_row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": "Expected attendance observation is absent from register",
                "threshold": True,
                "observed_value": "ABSENT",
                "explanation": f"Expected attendance observation for student {exp_row['student_id']} on valid school date {exp_row['date']} is missing."
            })
            
    return evidence_list


def evaluate_r004_invalid_record(df: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R004 - INVALID RECORD: Detect malformed dates, invalid status tokens, or structural defects.
    """
    cfg = config or RULE_CONFIG["R004"]
    valid_statuses = set(cfg.get("valid_statuses", ["NO_EXCEPTION_RECORDED", "SOURCE_MARK_S", "SOURCE_MARK_I", "SOURCE_MARK_A"]))
    evidence_list = []
    
    for _, row in df.iterrows():
        reasons = []
        
        # Check date format
        d_str = str(row.get("date", ""))
        try:
            d_obj = pd.to_datetime(d_str)
            if pd.isna(d_obj):
                reasons.append(f"Invalid/unparseable date: '{d_str}'")
        except Exception:
            reasons.append(f"Malformed date string: '{d_str}'")
            
        # Check status token
        status = str(row.get("attendance_status", ""))
        if status not in valid_statuses:
            reasons.append(f"Invalid attendance status token: '{status}'")
            
        # Check class_id
        cid = str(row.get("class_id", ""))
        if not cid or cid == "nan" or cid == "None":
            reasons.append("Missing class_id identifier")
            
        if reasons:
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": "; ".join(reasons),
                "threshold": True,
                "observed_value": f"status='{status}', date='{d_str}'",
                "explanation": f"Record {row['record_id']} contains structural defects: {'; '.join(reasons)}."
            })
            
    return evidence_list


def evaluate_r005_recent_spike(df_features: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R005 - RECENT EXCEPTION SPIKE: Trigger when exception_rate_7d and exception_count_7d exceed thresholds.
    """
    cfg = config or RULE_CONFIG["R005"]
    rate_thresh = cfg["exception_rate_7d_threshold"]
    count_thresh = cfg["min_exception_count_7d"]
    evidence_list = []
    
    for _, row in df_features.iterrows():
        rate = row["exception_rate_7d"]
        count = row["exception_count_7d"]
        
        if rate >= rate_thresh and count >= count_thresh:
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"7-day exception rate ({rate:.2%}) and count ({count}) exceeded thresholds ({rate_thresh:.2%}, min {count_thresh})",
                "threshold": rate_thresh,
                "observed_value": rate,
                "explanation": f"Student {row['student_id']} recorded {count} exceptions ({rate:.1%}) in the 7 days prior to {row['date']}."
            })
            
    return evidence_list


def evaluate_r006_exception_streak(df_features: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R006 - EXCEPTION STREAK: Trigger when consecutive_exception_days exceeds threshold.
    """
    cfg = config or RULE_CONFIG["R006"]
    streak_thresh = cfg["consecutive_exception_days_threshold"]
    evidence_list = []
    
    for _, row in df_features.iterrows():
        streak = row["consecutive_exception_days"]
        
        if streak >= streak_thresh:
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"Consecutive exception streak of {streak} days exceeded threshold of {streak_thresh} days",
                "threshold": streak_thresh,
                "observed_value": streak,
                "explanation": f"Student {row['student_id']} accumulated a streak of {streak} consecutive school days with exceptions prior to {row['date']}."
            })
            
    return evidence_list


def evaluate_r007_personal_deviation(df_features: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R007 - PERSONAL DEVIATION: Trigger when recent_vs_historical_deviation exceeds threshold.
    """
    cfg = config or RULE_CONFIG["R007"]
    dev_thresh = cfg["recent_vs_historical_deviation_threshold"]
    min_days = cfg["min_historical_evaluable_days"]
    evidence_list = []
    
    for _, row in df_features.iterrows():
        dev = row["recent_vs_historical_deviation"]
        hist_days = row["historical_evaluable_days"]
        
        if dev >= dev_thresh and hist_days >= min_days:
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"Personal exception rate deviation ({dev:+.2%}) exceeded threshold of +{dev_thresh:.2%}",
                "threshold": dev_thresh,
                "observed_value": dev,
                "explanation": f"Student {row['student_id']}'s recent 7-day exception rate is {dev:+.1%} higher than their historical baseline."
            })
            
    return evidence_list


def evaluate_r008_class_deviation(df_features: pd.DataFrame, config: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    R008 - CLASS DEVIATION: Trigger when student_vs_class_deviation exceeds threshold.
    """
    cfg = config or RULE_CONFIG["R008"]
    dev_thresh = cfg["student_vs_class_deviation_threshold"]
    min_eval = cfg["min_evaluable_days_7d"]
    evidence_list = []
    
    for _, row in df_features.iterrows():
        dev = row["student_vs_class_deviation"]
        eval_days = row["evaluable_days_7d"]
        
        if dev >= dev_thresh and eval_days >= min_eval:
            evidence_list.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "rule_id": cfg["rule_id"],
                "rule_category": cfg["category"],
                "triggered": True,
                "severity": cfg["severity"],
                "evidence": f"Student vs class exception rate deviation ({dev:+.2%}) exceeded threshold of +{dev_thresh:.2%}",
                "threshold": dev_thresh,
                "observed_value": dev,
                "explanation": f"Student {row['student_id']}'s 7-day exception rate is {dev:+.1%} higher than their class section average."
            })
            
    return evidence_list
