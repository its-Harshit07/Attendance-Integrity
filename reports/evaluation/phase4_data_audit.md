# Phase 4 Data Audit & Evaluation Population Report

## 1. Executive Summary

This report audits the underlying data assets prior to temporal splitting and model evaluation.

- **Canonical Dataset**: `data/processed/attendance_canonical.csv` (10,706 clean records)
- **Contaminated Dataset**: `data/ground_truth/contaminated_evaluation.csv` (10,721 records)
- **Ground Truth Labels**: `data/ground_truth/anomaly_labels.csv` (10,736 label entries)
- **Date Range**: August 1, 2025 to November 30, 2025

---

## 2. Records and Anomalies Breakdown by Month

| Month | Clean Records | Contaminated Records | Ground Truth Labels | Positive Anomaly Labels ($TP+FN$) | Unique Anomaly Injection Events |
|---|---|---|---|---|---|
| **August** | 2,697 | 2,707 | 2,711 | 63 | 24 |
| **September** | 2,702 | 2,706 | 2,710 | 66 | 25 |
| **October** | 2,694 | 2,694 | 2,697 | 63 | 25 |
| **November** | 2,613 | 2,614 | 2,618 | 58 | 26 |
| **TOTAL** | **10,706** | **10,721** | **10,736** | **250** | **100** |

---

## 3. Anomaly Categories Breakdown by Month (Affected Records)

| Category | August | September | October | November | Total Labels |
|---|---|---|---|---|---|
| `DUPLICATE` | 4 | 4 | 4 | 3 | 15 |
| `CONFLICT` | 10 | 10 | 10 | 5 | 35 |
| `MISSING_RECORD` | 4 | 5 | 4 | 2 | 15 |
| `INVALID_RECORD` | 5 | 5 | 5 | 5 | 20 |
| `BEHAVIORAL_SPIKE` | 12 | 14 | 14 | 11 | 51 |
| `EXCEPTION_STREAK` | 15 | 15 | 15 | 15 | 60 |
| `PERSONAL_DEVIATION` | 8 | 8 | 6 | 11 | 33 |
| `CLASS_DEVIATION` | 5 | 5 | 5 | 6 | 21 |
| **TOTAL** | **63** | **66** | **63** | **58** | **250** |

---

## 4. Ground Truth Integrity Guarantees

1. **Clean Data Protection**: The canonical dataset (`attendance_canonical.csv`) remains untouched.
2. **Label Immutability**: All labels in `anomaly_labels.csv` are persistent and immutable across evaluation runs.
3. **Traceability**: Every positive anomaly record links to a specific `anomaly_event_id` and `injection_id`.
