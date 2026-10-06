"""
Attendance Integrity System - Rule Engine Configuration
File: src/anomaly/rule_config.py

Centralized configuration for deterministic production rules R001-R008.
All thresholds are explicitly visible and documented.
Initial threshold values selected using clean training/validation data statistics.
"""

from typing import Dict, Any

RULE_CONFIG: Dict[str, Dict[str, Any]] = {
    "R001": {
        "rule_id": "R001",
        "name": "DUPLICATE",
        "category": "DATA_INTEGRITY",
        "severity": "HIGH",
        "description": "Same student/date appears more than once in the evaluated dataset.",
        "threshold": 1  # Count > 1 triggers rule
    },
    "R002": {
        "rule_id": "R002",
        "name": "CONFLICT",
        "category": "DATA_INTEGRITY",
        "severity": "HIGH",
        "description": "Same student/date has incompatible attendance status observations.",
        "threshold": 1  # Distinct status count > 1 triggers rule
    },
    "R003": {
        "rule_id": "R003",
        "name": "MISSING_RECORD",
        "category": "DATA_INTEGRITY",
        "severity": "HIGH",
        "description": "Expected school day observation is absent from the evaluated dataset for an active enrolled student.",
        "threshold": True
    },
    "R004": {
        "rule_id": "R004",
        "name": "INVALID_RECORD",
        "category": "DATA_INTEGRITY",
        "severity": "HIGH",
        "description": "Record contains malformed date, invalid status token, missing class identifier, or structural errors.",
        "valid_statuses": ["NO_EXCEPTION_RECORDED", "SOURCE_MARK_S", "SOURCE_MARK_I", "SOURCE_MARK_A"],
        "threshold": True
    },
    "R005": {
        "rule_id": "R005",
        "name": "BEHAVIORAL_SPIKE",
        "category": "BEHAVIORAL_SPIKE",
        "severity": "MEDIUM",
        "description": "7-day exception rate exceeds configured threshold with minimum exception count.",
        "exception_rate_7d_threshold": 0.50,  # 50% exception rate in prior 7 days
        "min_exception_count_7d": 3           # Minimum 3 exceptions in prior 7 days
    },
    "R006": {
        "rule_id": "R006",
        "name": "EXCEPTION_STREAK",
        "category": "EXCEPTION_STREAK",
        "severity": "MEDIUM",
        "description": "Consecutive evaluable school days with exception marks exceed configured threshold.",
        "consecutive_exception_days_threshold": 3  # 3 or more consecutive exception days
    },
    "R007": {
        "rule_id": "R007",
        "name": "PERSONAL_DEVIATION",
        "category": "PERSONAL_DEVIATION",
        "severity": "MEDIUM",
        "description": "Recent 7-day exception rate deviates significantly above student's historical baseline rate.",
        "recent_vs_historical_deviation_threshold": 0.35,  # 35 percentage point increase over historical rate
        "min_historical_evaluable_days": 10              # Requires at least 10 prior evaluable days for stable baseline
    },
    "R008": {
        "rule_id": "R008",
        "name": "CLASS_DEVIATION",
        "category": "CLASS_DEVIATION",
        "severity": "MEDIUM",
        "description": "Student 7-day exception rate deviates significantly above peer class average exception rate.",
        "student_vs_class_deviation_threshold": 0.40,  # 40 percentage point increase over peer class rate
        "min_evaluable_days_7d": 3                     # Minimum 3 evaluable days in lookback window
    }
}
