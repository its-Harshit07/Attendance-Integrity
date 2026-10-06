# Production Rules Baseline Evaluation Report (Reconciled)

## 1. Executive Summary

- **Evaluated Dataset**: November 2025 Test Split (2,618 total evaluation instances)
- **Ground-Truth Positives (TP + FN)**: 58 record labels
- **Ground-Truth Negatives (TN + FP)**: 2560 record labels
- **Overall Precision**: 0.2903 (29.03%)
- **Overall Recall**: 0.6207 (62.07%)
- **Overall F1-Score**: 0.3956
- **Accuracy**: 0.9580 (95.80%)
- **False Positive Rate (FPR)**: 0.0344 (3.44%)
- **False Negative Rate (FNR)**: 0.3793 (37.93%)

## 2. Reconciled Confusion Matrix Breakdown

| Metric | Count | Formula / Verification |
|---|---|---|
| True Positives (TP) | `36` | Detected positive records |
| True Negatives (TN) | `2472` | Correctly cleared negative records |
| False Positives (FP) | `88` | Clean records flagged by rules |
| False Negatives (FN) | `22` | Injected records missed by rules |
| **Total Evaluated Population** | `2,618` | `TP + TN + FP + FN = 36 + 2472 + 88 + 22` |

## 3. Performance Metrics by Anomaly Category

| Category | Injected Records | TP | FN | Recall | Precision | F1 |
|---|---|---|---|---|---|---|
| `DUPLICATE` | 3 | 3 | 0 | 100.00% | 3.30% | 0.0638 |
| `CONFLICT` | 5 | 5 | 0 | 100.00% | 5.38% | 0.1020 |
| `MISSING_RECORD` | 2 | 2 | 0 | 100.00% | 2.22% | 0.0435 |
| `INVALID_RECORD` | 5 | 3 | 2 | 60.00% | 3.30% | 0.0625 |
| `BEHAVIORAL_SPIKE` | 11 | 5 | 6 | 45.45% | 5.38% | 0.0962 |
| `EXCEPTION_STREAK` | 15 | 10 | 5 | 66.67% | 10.20% | 0.1770 |
| `PERSONAL_DEVIATION` | 11 | 5 | 6 | 45.45% | 5.38% | 0.0962 |
| `CLASS_DEVIATION` | 6 | 3 | 3 | 50.00% | 3.30% | 0.0619 |

## 4. Key Findings & Baseline Limitations

1. **Data Integrity Rules (`R001`-`R004`)**: Achieve 100% recall on deterministic structural errors (`DUPLICATE`, `CONFLICT`, `MISSING_RECORD`).
2. **Missing Record Reconciliation (`R003`)**: Resolves original join mismatch by utilizing canonical `record_id` from `expected_observations.csv`, achieving 100% recall (2/2 TP).
3. **Behavioral Rules (`R005`-`R008`)**: Static thresholds detect major streaks (66.7% recall on `EXCEPTION_STREAK`), but miss subtle personal/class shifts below static cutoffs.
