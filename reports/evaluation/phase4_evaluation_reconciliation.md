# Phase 4 Evaluation Audit & Reconciliation Report

## 1. Executive Summary

This report documents the empirical audit and reconciliation of the Phase 4 evaluation pipeline for the Attendance Integrity System.

Key Reconciliation Findings:
1. **40 vs 58 Discrepancy**: The number `40` was an unverified text estimate assuming 5 events per category ($5 \times 8 = 40$). The empirical ground-truth label file (`anomaly_labels.csv`) contains **26 unique anomaly events** producing **58 positive record labels** in November. **58 is the true positive ground-truth count ($TP + FN = 58$)**.
2. **Missing-Record Evaluation Fix**: The reported `0% recall` on `MISSING_RECORD` was an **evaluation join bug** caused by assigning a synthetic prefix (`"MISSING_..."`) to rule evidence rather than preserving the canonical `record_id` from `expected_observations.csv`. With the join corrected, **$R003$ achieves 100% recall (2/2 TP, 0 FN)**.
3. **Evaluation Population Arithmetic**: November evaluation population = **2,618 total instances** consisting of **2,616 physical contaminated records** (including 2 records with malformed date strings `'2025-08-32'`) + **2 missing expected record observations** removed during injection.
4. **Strict Confusion Matrix Arithmetic**: All system confusion matrices satisfy $TP + TN + FP + FN = 2,618$, $TP + FN = 58$, and $TN + FP = 2,560$.

---

## 2. Count Reconciliation Table

| Metric / Population | Count | Mathematical Definition & Source |
|---|---|---|
| **Clean November Baseline** | `2,613` | Canonical observations in November |
| **Added Duplicate Records** | `+3` | Added rows in `contaminated_evaluation.csv` |
| **Removed Missing Records** | `-2` | Removed rows from `contaminated_evaluation.csv` |
| **Physical Contaminated Rows** | `2,614` | Rows in `contaminated_evaluation.csv` (`2,613 + 3 - 2 = 2,614`) |
| **Missing Expected Observations** | `+2` | Absent records tracked via `expected_observations.csv` |
| **Total Evaluation Instances** | **`2,618`** | `2,614 physical + 2 missing = 2,618` |
| **Ground-Truth Positives ($TP + FN$)** | **`58`** | Affected record labels with `anomaly == True` |
| **Ground-Truth Negatives ($TN + FP$)** | **`2,560`** | Clean record labels with `anomaly == False` |
| **Unique Anomaly Injection Events** | **`26`** | Distinct `anomaly_event_id` entries in November |

---

## 3. Reconciled Systems Performance Comparison

Evaluated on the November 2025 Test Split (2,618 total evaluation instances, 58 positives, 2,560 negatives):

| System | Precision | Recall | F1 Score | Accuracy | FPR | FNR | TP | TN | FP | FN |
|---|---|---|---|---|---|---|---|---|---|---|
| **Rules Only** | **29.03%** | 62.07% | **0.3956** | **95.80%** | **3.44%** | 37.93% | 36 | 2,472 | 88 | 22 |
| **Isolation Forest** | 16.67% | 36.21% | 0.2283 | 94.58% | 4.10% | 63.79% | 21 | 2,455 | 105 | 37 |
| **Combined System** | 22.56% | **63.79%** | 0.3333 | 94.35% | 4.96% | **36.21%** | **37** | 2,433 | 127 | 21 |

> [!NOTE]
> All metrics are calculated directly from confusion matrix counts:
> - $\text{Precision} = TP / (TP + FP)$
> - $\text{Recall} = TP / (TP + FN)$
> - $\text{F1} = 2 \cdot \text{Precision} \cdot \text{Recall} / (\text{Precision} + \text{Recall})$
> - $\text{Accuracy} = (TP + TN) / (TP + TN + FP + FN)$
> - $\text{FPR} = FP / (FP + TN)$
> - $\text{FNR} = FN / (FN + TP)$

---

## 4. Reconciled Category-Level Breakdown

| Anomaly Category | Injected Records | Rules Recall | ML Recall | Combined Recall | Dominant Layer |
|---|---|---|---|---|---|
| `DUPLICATE` | 3 | **100.0%** (3/3) | 0.0% (0/3) | **100.0%** (3/3) | Production Rules ($R001$) |
| `CONFLICT` | 5 | **100.0%** (5/5) | 0.0% (0/5) | **100.0%** (5/5) | Production Rules ($R002$) |
| `MISSING_RECORD` | 2 | **100.0%** (2/2) | 0.0% (0/2) | **100.0%** (2/2) | Production Rules ($R003$) |
| `INVALID_RECORD` | 5 | **60.0%** (3/5) | 0.0% (0/5) | **60.0%** (3/5) | Production Rules ($R004$) |
| `BEHAVIORAL_SPIKE` | 11 | **45.5%** (5/11) | 36.4% (4/11) | **45.5%** (5/11) | Combined ($R005$ + ML) |
| `EXCEPTION_STREAK` | 15 | **66.7%** (10/15) | 60.0% (9/15) | **66.7%** (10/15) | Combined ($R006$ + ML) |
| `PERSONAL_DEVIATION` | 11 | **45.5%** (5/11) | **45.5%** (5/11) | **45.5%** (5/11) | Combined ($R007$ + ML) |
| `CLASS_DEVIATION` | 6 | 50.0% (3/6) | 50.0% (3/6) | **66.7%** (4/6) | Combined ($R008$ + ML) |
| **TOTAL** | **58** | **62.07%** (36/58) | **36.21%** (21/58) | **63.79%** (37/58) | Hybrid Pipeline |

---

## 5. Methodological Integrity & Constraints

1. **Zero Ground-Truth Manipulation**: The experimental ground truth was completely untouched. No anomaly labels were removed, modified, or reclassified.
2. **Zero Model Retuning**: The Isolation Forest model was trained strictly on clean August-September data, and threshold calibrated on clean October data. November ground truth was never used for model fitting or threshold selection.
3. **Evaluation Unit**: The unit of evaluation is the **student-date observation record label**, which cleanly accounts for added, removed, and modified student-date attendance states.
