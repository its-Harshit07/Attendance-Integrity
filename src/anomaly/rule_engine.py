"""
Attendance Integrity System - Rule Engine Coordinator
File: src/anomaly/rule_engine.py

Executes production rules R001-R008 on evaluation datasets and produces structured evidence outputs.
"""

import os
from typing import List, Dict, Any, Optional
import pandas as pd
from src.anomaly.rule_config import RULE_CONFIG
from src.anomaly.rules import (
    evaluate_r001_duplicate,
    evaluate_r002_conflict,
    evaluate_r003_missing_expected,
    evaluate_r004_invalid_record,
    evaluate_r005_recent_spike,
    evaluate_r006_exception_streak,
    evaluate_r007_personal_deviation,
    evaluate_r008_class_deviation
)


class RuleEngine:
    """Production Rule Engine for deterministic anomaly detection."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or RULE_CONFIG

    def run_all_rules(
        self,
        df_eval: pd.DataFrame,
        df_features: pd.DataFrame,
        df_expected_obs: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """
        Execute all production rules R001-R008 against evaluated dataset & features.

        Returns DataFrame of structured rule evidence.
        """
        all_evidence: List[Dict[str, Any]] = []

        # R001 - DUPLICATE
        ev_r001 = evaluate_r001_duplicate(df_eval, self.config.get("R001"))
        all_evidence.extend(ev_r001)

        # R002 - CONFLICT
        ev_r002 = evaluate_r002_conflict(df_eval, self.config.get("R002"))
        all_evidence.extend(ev_r002)

        # R003 - MISSING EXPECTED RECORD
        if df_expected_obs is not None and not df_expected_obs.empty:
            ev_r003 = evaluate_r003_missing_expected(df_eval, df_expected_obs, self.config.get("R003"))
            all_evidence.extend(ev_r003)

        # R004 - INVALID RECORD
        ev_r004 = evaluate_r004_invalid_record(df_eval, self.config.get("R004"))
        all_evidence.extend(ev_r004)

        # Behavioral rules on features (R005 - R008)
        ev_r005 = evaluate_r005_recent_spike(df_features, self.config.get("R005"))
        all_evidence.extend(ev_r005)

        ev_r006 = evaluate_r006_exception_streak(df_features, self.config.get("R006"))
        all_evidence.extend(ev_r006)

        ev_r007 = evaluate_r007_personal_deviation(df_features, self.config.get("R007"))
        all_evidence.extend(ev_r007)

        ev_r008 = evaluate_r008_class_deviation(df_features, self.config.get("R008"))
        all_evidence.extend(ev_r008)

        if not all_evidence:
            return pd.DataFrame(columns=[
                "record_id", "student_id", "date", "rule_id", "rule_category",
                "triggered", "severity", "evidence", "threshold", "observed_value", "explanation"
            ])

        return pd.DataFrame(all_evidence)
