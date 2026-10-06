"""
Attendance Integrity System - Feature Engineering Module
File: src/data/feature_engineering.py

Generates temporal & contextual features from attendance_canonical.csv
strictly avoiding temporal leakage (lookbacks use data < date D).
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Exceptions indicators
EXCEPTION_STATUSES = {"SOURCE_MARK_S", "SOURCE_MARK_I", "SOURCE_MARK_A"}
IDENTIFIER_COLUMNS = ["record_id", "student_id", "student_number", "student_name_anonymized"]


def compute_temporal_features(df_canonical):
    """
    Compute rolling, recency, historical, and class-relative features
    from canonical long-format attendance dataframe.

    Strict Temporal Leakage Policy:
    For a record on date D, all lookback windows (7d, 14d, 30d), cumulative statistics,
    streak metrics, and class averages are computed using observations strictly BEFORE date D (date < D).
    """
    df = df_canonical.copy()

    # Ensure datetime parsing and sorting (robust to malformed date strings)
    df["dt"] = pd.to_datetime(df["date"], errors="coerce")
    # For rows with malformed dates, assign fallback timestamp far in future so they sort cleanly
    df["dt_clean"] = df["dt"].fillna(pd.Timestamp("2099-12-31"))
    df = df.sort_values(["student_id", "dt_clean"]).reset_index(drop=True)

    # Indicator columns
    df["is_exception"] = df["attendance_status"].isin(EXCEPTION_STATUSES).astype(int)
    # Weekends (is_school_day == 'FALSE') are not school attendance opportunities
    df["is_evaluable"] = (df["is_school_day"] != "FALSE").astype(int)

    # Pre-calculate student-level timelines for fast rolling lookups
    student_timeline = {}
    for stu_id, stu_df in df.groupby("student_id"):
        # List of tuples: (dt, is_exception, is_evaluable, date_str)
        student_timeline[stu_id] = list(zip(
            stu_df["dt"].tolist(),
            stu_df["is_exception"].tolist(),
            stu_df["is_evaluable"].tolist(),
            stu_df["date"].tolist()
        ))

    # Pre-calculate class-level timelines for class rate calculations
    class_daily = {}
    for (class_id, dt), group in df.groupby(["class_id", "dt"]):
        class_daily[(class_id, dt)] = {
            "exceptions": group["is_exception"].sum(),
            "evaluable": group["is_evaluable"].sum()
        }

    # Pre-aggregate unique dates per class
    class_dates = {}
    for class_id, group in df.groupby("class_id"):
        class_dates[class_id] = sorted(group["dt"].unique())

    # Results list
    features = []

    for idx, row in df.iterrows():
        stu_id = row["student_id"]
        class_id = row["class_id"]
        cur_dt = row["dt"]

        timeline = student_timeline[stu_id]

        # Filter strictly prior observations (date < D)
        prior_timeline = [t for t in timeline if t[0] < cur_dt]

        # 1. Lookback windows (7d, 14d, 30d prior to D)
        d7_start = cur_dt - timedelta(days=7)
        d14_start = cur_dt - timedelta(days=14)
        d30_start = cur_dt - timedelta(days=30)

        t7 = [t for t in prior_timeline if t[0] >= d7_start]
        t14 = [t for t in prior_timeline if t[0] >= d14_start]
        t30 = [t for t in prior_timeline if t[0] >= d30_start]

        exception_count_7d = sum(t[1] for t in t7)
        evaluable_days_7d = sum(t[2] for t in t7)
        exception_rate_7d = (exception_count_7d / evaluable_days_7d) if evaluable_days_7d > 0 else 0.0

        exception_count_14d = sum(t[1] for t in t14)
        evaluable_days_14d = sum(t[2] for t in t14)
        exception_rate_14d = (exception_count_14d / evaluable_days_14d) if evaluable_days_14d > 0 else 0.0

        exception_count_30d = sum(t[1] for t in t30)
        evaluable_days_30d = sum(t[2] for t in t30)
        exception_rate_30d = (exception_count_30d / evaluable_days_30d) if evaluable_days_30d > 0 else 0.0

        # 2. Historical cumulative features (strictly prior to D)
        historical_exception_count = sum(t[1] for t in prior_timeline)
        historical_evaluable_days = sum(t[2] for t in prior_timeline)
        historical_exception_rate = (historical_exception_count / historical_evaluable_days) if historical_evaluable_days > 0 else 0.0

        # 3. Streak & Recency Features
        consecutive_exception_days = 0
        for t in reversed(prior_timeline):
            if t[2] == 1: # Evaluated school day
                if t[1] == 1:
                    consecutive_exception_days += 1
                else:
                    break # Streak broken by evaluable non-exception day

        prior_exceptions = [t for t in prior_timeline if t[1] == 1]
        if prior_exceptions:
            last_exc_dt = prior_exceptions[-1][0]
            days_since_last_exception = (cur_dt - last_exc_dt).days
        else:
            days_since_last_exception = -1

        # 4. Deviations
        recent_vs_historical_deviation = round(exception_rate_7d - historical_exception_rate, 6)

        # 5. Class-relative context (7-day lookback prior to D across class)
        c_dates = [d for d in class_dates[class_id] if d7_start <= d < cur_dt]
        c_exc = sum(class_daily.get((class_id, d), {}).get("exceptions", 0) for d in c_dates)
        c_eval = sum(class_daily.get((class_id, d), {}).get("evaluable", 0) for d in c_dates)

        peer_exc = max(0, c_exc - exception_count_7d)
        peer_eval = max(0, c_eval - evaluable_days_7d)

        class_exception_rate = (peer_exc / peer_eval) if peer_eval > 0 else 0.0
        student_vs_class_deviation = round(exception_rate_7d - class_exception_rate, 6)

        features.append({
            "record_id": row["record_id"],
            "student_id": row["student_id"],
            "student_number": row["student_number"],
            "student_name_anonymized": row["student_name_anonymized"],
            "class_id": row["class_id"],
            "date": row["date"],
            "month": row["month"],
            "day_of_week": row["day_of_week"],
            "is_school_day": row["is_school_day"],
            "raw_status": row["raw_status"],
            "attendance_status": row["attendance_status"],
            # Numerical features for ML
            "exception_count_7d": exception_count_7d,
            "exception_count_14d": exception_count_14d,
            "exception_count_30d": exception_count_30d,
            "evaluable_days_7d": evaluable_days_7d,
            "evaluable_days_14d": evaluable_days_14d,
            "evaluable_days_30d": evaluable_days_30d,
            "exception_rate_7d": round(exception_rate_7d, 6),
            "exception_rate_14d": round(exception_rate_14d, 6),
            "exception_rate_30d": round(exception_rate_30d, 6),
            "historical_exception_count": historical_exception_count,
            "historical_evaluable_days": historical_evaluable_days,
            "historical_exception_rate": round(historical_exception_rate, 6),
            "consecutive_exception_days": consecutive_exception_days,
            "days_since_last_exception": days_since_last_exception,
            "recent_vs_historical_deviation": recent_vs_historical_deviation,
            "class_exception_rate_7d": round(class_exception_rate, 6),
            "student_vs_class_deviation": student_vs_class_deviation
        })

    df_features = pd.DataFrame(features)
    return df_features
