# Temporal Train/Validation/Test Split Protocol Report

## 1. Executive Summary

This report establishes the temporal split protocol for evaluating the Attendance Integrity System.

Random train/test splitting was strictly avoided to prevent temporal leakage and data snooping across longitudinal student attendance sequences.

---

## 2. Temporal Split Protocol Structure

| Split | Time Period | Date Range | Primary Dataset Source | Total Records | Ground Truth Positives ($TP+FN$) | Role in ML Pipeline |
|---|---|---|---|---|---|---|
| **TRAIN** | August + September 2025 | 2025-08-01 to 2025-09-30 | `clean_evaluation_features.csv` | **5,399** | 0 | Model fitting ONLY (clean baseline) |
| **VALIDATION** | October 2025 | 2025-10-01 to 2025-10-31 | `clean_evaluation_features.csv` | **2,697** | 0 | Threshold calibration ONLY (99th percentile) |
| **TEST** | November 2025 | 2025-11-01 to 2025-11-30 | `contaminated_evaluation_features.csv` + `expected_observations.csv` | **2,618** | **58** | Final performance evaluation ONLY |

---

## 3. Rationale & Leakage Prevention Guarantees

1. **Sequential Evaluation**: Training on historical months ($T_{train} < T_{val} < T_{test}$) mirrors real-world deployment where models operate on past registers to flag future anomalies.
2. **Strict Lookback Policy**: For any record on date $D$, all feature lookback windows (7d, 14d, 30d, historical rates, class context) use observations strictly prior to $D$ ($date < D$).
3. **No Target Leakage**: Ground-truth anomaly labels (`gt_is_anomaly`, `gt_anomaly_category`, `injection_id`) and identifiers (`student_id`, `record_id`) are excluded from model training inputs.
