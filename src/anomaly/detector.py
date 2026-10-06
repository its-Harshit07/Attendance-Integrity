"""
Attendance Integrity System - Isolation Forest Anomaly Detector
File: src/anomaly/detector.py

Trains Isolation Forest ONLY on clean training data using numerical temporal/context features.
Threshold calibrated systematically on clean validation dataset.
Exports model artifact (models/isolation_forest_v1.pkl) and metadata (models/model_metadata.json).
"""

import os
import json
import pickle
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest

FEATURE_COLUMNS = [
    "exception_count_7d",
    "exception_count_14d",
    "exception_count_30d",
    "exception_rate_7d",
    "exception_rate_14d",
    "exception_rate_30d",
    "historical_exception_count",
    "historical_exception_rate",
    "consecutive_exception_days",
    "days_since_last_exception",
    "recent_vs_historical_deviation",
    "class_exception_rate_7d",
    "student_vs_class_deviation"
]

EXCLUDED_INPUT_COLUMNS = [
    "record_id", "student_id", "student_number", "student_name_anonymized",
    "class_id", "date", "month", "day_of_week", "is_school_day", "raw_status",
    "attendance_status", "gt_is_anomaly", "gt_anomaly_category", "gt_anomaly_event_id",
    "is_anomaly", "anomaly_category", "anomaly_event_id", "injection_id"
]


class AttendanceAnomalyDetector:
    """Isolation Forest anomaly detector for attendance features."""

    def __init__(
        self,
        n_estimators: int = 100,
        max_samples: str = "auto",
        contamination: float = 0.01,
        random_state: int = 42,
        model_version: str = "v1.0.0"
    ):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.contamination = contamination
        self.random_state = random_state
        self.model_version = model_version

        self.model: Optional[IsolationForest] = None
        self.feature_names: List[str] = FEATURE_COLUMNS
        self.operating_threshold_raw: float = 0.0
        self.score_min: float = 0.0
        self.score_max: float = 1.0
        self.is_trained: bool = False

    def train(self, df_train: pd.DataFrame) -> None:
        """
        Train Isolation Forest strictly on clean training data.
        Ensures metadata, identifiers, and ground-truth fields are excluded.
        """
        # Strict validation: Ensure ground truth fields are absent from training set
        for col in ["gt_is_anomaly", "gt_anomaly_category", "is_anomaly", "anomaly_category", "injection_id"]:
            assert col not in df_train.columns or df_train[col].nunique() <= 1, (
                f"Experimental Integrity Violation: Ground truth field '{col}' present in training data!"
            )

        X = df_train[self.feature_names].fillna(0).copy()

        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            max_samples=self.max_samples,
            contamination=self.contamination,
            random_state=self.random_state
        )
        self.model.fit(X)
        self.is_trained = True

    def calibrate_threshold(self, df_val: pd.DataFrame, percentile: float = 99.0) -> float:
        """
        Calibrate anomaly score operating threshold using clean validation dataset.
        Higher score = more anomalous.
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before threshold calibration!")

        X_val = df_val[self.feature_names].fillna(0).copy()

        # Scikit-learn decision_function returns negative values for anomalous, positive for normal.
        # Negate so higher score = more anomalous.
        raw_val_scores = -self.model.decision_function(X_val)

        self.score_min = float(raw_val_scores.min())
        self.score_max = float(raw_val_scores.max())

        self.operating_threshold_raw = float(np.percentile(raw_val_scores, percentile))
        return self.operating_threshold_raw

    def _normalize_score(self, raw_score: np.ndarray) -> np.ndarray:
        """Normalize raw scores to [0.0, 1.0] where 1.0 = highly anomalous."""
        denom = max(1e-6, self.score_max - self.score_min)
        norm = (raw_score - self.score_min) / denom
        return np.clip(norm, 0.0, 1.0)

    def predict(self, df_eval: pd.DataFrame) -> pd.DataFrame:
        """
        Predict anomaly scores and flags for evaluated dataset.

        Output convention:
        - anomaly_score: float in [0.0, 1.0], higher = more suspicious/anomalous.
        - ml_flag: True if raw anomaly score >= operating threshold, False otherwise.
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before generating predictions!")

        X_eval = df_eval[self.feature_names].fillna(0).copy()
        raw_scores = -self.model.decision_function(X_eval)

        norm_scores = self._normalize_score(raw_scores)
        ml_flags = raw_scores >= self.operating_threshold_raw

        norm_thresh = float(self._normalize_score(np.array([self.operating_threshold_raw]))[0])

        results = []
        for idx, row in df_eval.iterrows():
            results.append({
                "record_id": row["record_id"],
                "student_id": row["student_id"],
                "date": row["date"],
                "raw_score": round(float(raw_scores[idx]), 6),
                "anomaly_score": round(float(norm_scores[idx]), 6),
                "normalized_threshold": round(norm_thresh, 6),
                "ml_flag": bool(ml_flags[idx]),
                "model_version": self.model_version
            })

        return pd.DataFrame(results)

    def save_model(self, model_dir: str, train_record_count: int, train_date_range: str) -> Tuple[str, str]:
        """Save trained model pickle and metadata JSON file."""
        os.makedirs(model_dir, exist_ok=True)

        pkl_path = os.path.join(model_dir, "isolation_forest_v1.pkl")
        meta_path = os.path.join(model_dir, "model_metadata.json")

        with open(pkl_path, "wb") as f:
            pickle.dump({
                "model": self.model,
                "feature_names": self.feature_names,
                "operating_threshold_raw": self.operating_threshold_raw,
                "score_min": self.score_min,
                "score_max": self.score_max,
                "model_version": self.model_version
            }, f)

        metadata = {
            "model_version": self.model_version,
            "training_date": datetime.now(timezone.utc).isoformat(),
            "training_date_range": train_date_range,
            "training_record_count": train_record_count,
            "feature_list": self.feature_names,
            "hyperparameters": {
                "n_estimators": self.n_estimators,
                "max_samples": self.max_samples,
                "contamination": self.contamination,
                "random_state": self.random_state
            },
            "random_seed": self.random_state,
            "validation_procedure": "Threshold selected at 99th percentile of clean October validation set anomaly scores",
            "operating_threshold_raw": self.operating_threshold_raw,
            "score_min": self.score_min,
            "score_max": self.score_max,
            "score_convention": "higher score = more anomalous (normalized [0.0, 1.0])"
        }

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return pkl_path, meta_path
