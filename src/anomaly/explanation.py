"""
Attendance Integrity System - Transparent Evidence Explanation Generator
File: src/anomaly/explanation.py

Generates transparent, human-understandable administrator explanations based strictly on empirical evidence.
Avoids vague black-box phrases like 'AI detected fraud'.
"""

from typing import Dict, Any, List, Optional
import pandas as pd


def generate_record_explanation(
    record_id: str,
    student_id: str,
    date: str,
    risk_level: str,
    rule_evidence_list: List[Dict[str, Any]],
    ml_info: Dict[str, Any],
    feature_row: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate transparent evidence-based explanation.
    """
    explanations = []

    # 1. Data Integrity Rules Evidence
    di_rules = [r for r in rule_evidence_list if r["rule_category"] == "DATA_INTEGRITY"]
    if di_rules:
        for r in di_rules:
            explanations.append(f"Data Integrity Rule [{r['rule_id']}]: {r['explanation']}")

    # 2. Behavioral Rules Evidence
    beh_rules = [r for r in rule_evidence_list if r["rule_category"] != "DATA_INTEGRITY"]
    if beh_rules:
        for r in beh_rules:
            explanations.append(f"Behavioral Indicator [{r['rule_id']}]: {r['explanation']}")

    # 3. Machine Learning Score Evidence
    anom_score = ml_info.get("anomaly_score", 0.0)
    ml_flag = ml_info.get("ml_flag", False)

    if ml_flag:
        explanations.append(
            f"Machine Learning Detector: Statistical anomaly score ({anom_score:.2f}) "
            f"exceeded the operating threshold. Multivariate feature pattern deviates from clean baseline."
        )

    # 4. Contextual & Peer Summary (if features provided)
    if feature_row:
        r_rate = feature_row.get("exception_rate_7d", 0.0)
        h_rate = feature_row.get("historical_exception_rate", 0.0)
        c_rate = feature_row.get("class_exception_rate_7d", 0.0)
        explanations.append(
            f"Supporting Evidence: Student's 7-day exception rate is {r_rate:.1%} "
            f"(Historical baseline: {h_rate:.1%}, Class section average: {c_rate:.1%})."
        )

    if not explanations:
        summary = "No anomaly flags triggered. Attendance pattern is consistent with historical baseline."
    else:
        summary = " ".join(explanations)

    # Prefix with administrative recommendation
    if risk_level in ["CRITICAL", "HIGH", "MEDIUM"]:
        action_prefix = f"Review recommended [{risk_level} Risk]: "
    else:
        action_prefix = "Normal Record: "

    full_explanation = action_prefix + summary

    return {
        "record_id": record_id,
        "student_id": student_id,
        "date": date,
        "risk_level": risk_level,
        "summary_explanation": full_explanation,
        "detail_explanations": explanations,
        "anomaly_score": anom_score,
        "rule_count": len(rule_evidence_list)
    }
