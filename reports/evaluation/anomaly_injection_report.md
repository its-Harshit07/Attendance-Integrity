# Controlled Anomaly Injection & Evaluation Framework Report

## 1. Executive Summary

- **Random Seed**: `42` (Fixed & Fully Reproducible)
- **Clean Evaluation Records**: 10,706
- **Contaminated Evaluation Records**: 10,721
- **Total Positive Anomaly Records**: 250
- **Total Legitimate Negative Records**: 10,486
- **Unique Anomaly Events**: 100
- **Ground-Truth Label File**: [anomaly_labels.csv](file:///d:/PROJECTS/ATTENDANCE_ANALYZER/data/ground_truth/anomaly_labels.csv)
- **Injection Audit Log**: [injection_log.csv](file:///d:/PROJECTS/ATTENDANCE_ANALYZER/data/ground_truth/injection_log.csv)

> [!IMPORTANT]
> **Source Data Integrity**: The canonical dataset (`attendance_canonical.csv`) remains **100% UNMODIFIED**. Synthetic anomalies exist solely in `contaminated_evaluation.csv` for evaluating model detection performance.

## 2. Dataset Arithmetic Reconciliation Table

| Dataset Metric | Row Count | Description / Formula |
|---|---|---|
| **Clean Evaluation Rows** | `10,706` | Baseline clean canonical observations |
| **Added Rows** | `+30` | Synthetic rows added (15 DUPLICATE + 15 CONFLICT) |
| **Removed Rows** | `-15` | Expected observations removed (15 MISSING_RECORD) |
| **Modified Rows (in-place)** | `205` | Existing records modified in place |
| **Untouched Clean Rows** | `10,486` | Baseline clean records left completely unmodified |
| **Contaminated Evaluation Rows** | `10,721` | `CLEAN + ADDED - REMOVED` (`10,706 + 30 - 15 = 10,721`) |
| **Ground-Truth Label Rows** | `10,736` | `CLEAN + ADDED` (`10,706 + 30 = 10,736`) |
| **Positive Anomaly Labels** | `250` | `REMOVED + MODIFIED + ADDED` (`15 + 205 + 30 = 250`) |
| **Legitimate Negative Labels** | `10,486` | `UNTOUCHED CLEAN` (`10,486`) |

## 3. Injected Anomaly Breakdown by Category

| Anomaly Category | Anomaly Events | Affected Records | Injected Anomaly Type | Neutral Description & Rule |
|---|---|---|---|---|
| `DUPLICATE` | 15 | 15 | `DUPLICATE` | Exact duplicate observation added for same student/date |
| `CONFLICT` | 15 | 15 | `CONFLICT` | Conflicting status mark observation added for same student/date |
| `MISSING_RECORD` | 15 | 15 | `MISSING_RECORD` | Expected observation removed from date with `expected_observation == TRUE` |
| `INVALID_RECORD` | 15 | 15 | `INVALID_RECORD` | Structurally invalid record injected (malformed date / status token / class ID) |
| `BEHAVIORAL_SPIKE` | 10 | 40 | `BEHAVIORAL_SPIKE` | Unusual source-exception spike (4 consecutive `SOURCE_MARK_S` marks) |
| `EXCEPTION_STREAK` | 10 | 60 | `EXCEPTION_STREAK` | Consecutive source-exception streak (6 consecutive `SOURCE_MARK_S` marks) |
| `PERSONAL_DEVIATION` | 10 | 50 | `PERSONAL_DEVIATION` | Personal source-exception baseline deviation (5 scattered `SOURCE_MARK_I` marks) |
| `CLASS_DEVIATION` | 10 | 40 | `CLASS_DEVIATION` | Class-relative source-exception deviation (4 `SOURCE_MARK_A` marks in zero-exception class context) |

## 4. Legitimate Negative & Non-Anomalous Baseline

To measure model false-positive rates accurately, the evaluation dataset contains **10,486 legitimate non-anomalous records**, including:
- **Normal Unmarked Register Cells**: Standard daily attendance entries (`NO_EXCEPTION_RECORDED`).
- **Legitimate Source Exception Marks**: Historical sick (`s`), permission (`i`), and absence (`a`) marks in the real source dataset are strictly labeled `anomaly = FALSE`.
- **Roster Disappearances**: Post-disappearance dates for `SISWA_060` and `SISWA_089` are labeled `anomaly = FALSE` (not missing records).

## 5. Automated Validation Checks & Safety Controls

1. **Canonical Invariance**: Hash verification confirms `attendance_canonical.csv` was untouched.
2. **Missing Record Target Policy**: Synthetic missing record injections were restricted strictly to dates with `expected_observation == TRUE` (weekends and UNKNOWN calendar days excluded).
3. **Overlap Prevention**: Every synthetic injection receives a unique `injection_id` (`inj_001`, `inj_002`...) and `anomaly_event_id` (`evt_001`, `evt_002`...) without overlapping targets.
4. **Feature Exclusion**: Ground-truth label columns (`anomaly`, `anomaly_type`, `injection_id`, `anomaly_event_id`) are completely isolated from ML feature sets.
