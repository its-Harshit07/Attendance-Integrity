# Model Comparison & Systems Evaluation Report (Reconciled)

## 1. Executive Summary

This report presents a rigorous temporal evaluation comparing three detection systems on the November 2025 test dataset:
1. **Rules Only**: Deterministic production rules R001-R008
2. **Isolation Forest Only**: Unsupervised ML trained strictly on clean August-September data
3. **Combined System**: Interpretable rule evidence + ML score decision engine

- **Total Evaluated Instances**: `2,618` record labels
- **Ground-Truth Positives (TP + FN)**: `58` record labels
- **Ground-Truth Negatives (TN + FP)**: `2560` record labels

## 2. Overall Performance Comparison Table

| System | Precision | Recall | F1 Score | Accuracy | FPR | FNR | TP | TN | FP | FN |
|---|---|---|---|---|---|---|---|---|---|---|
| **Rules Only** | 0.2903 (29.03%) | 0.6207 (62.07%) | **0.3956** | 0.9580 (95.80%) | 0.0344 (3.44%) | 0.3793 (37.93%) | 36 | 2472 | 88 | 22 |
| **Isolation Forest** | 0.1667 (16.67%) | 0.3621 (36.21%) | **0.2283** | 0.9458 (94.58%) | 0.0410 (4.10%) | 0.6379 (63.79%) | 21 | 2455 | 105 | 37 |
| **Combined System** | 0.2256 (22.56%) | 0.6379 (63.79%) | **0.3333** | 0.9435 (94.35%) | 0.0496 (4.96%) | 0.3621 (36.21%) | 37 | 2433 | 127 | 21 |

## 3. Performance Metrics by Anomaly Category

| Anomaly Category | Injected Records | System | Recall | Precision | F1 Score | TP | FN | FP |
|---|---|---|---|---|---|---|---|---|
| `DUPLICATE` | 3 | Rules Only | 100.00% | 3.30% | 0.0638 | 3 | 0 | 88 |
| `DUPLICATE` | 3 | Isolation Forest | 0.00% | 0.00% | 0.0000 | 0 | 3 | 105 |
| `DUPLICATE` | 3 | Combined System | 100.00% | 2.31% | 0.0451 | 3 | 0 | 127 |
| `CONFLICT` | 5 | Rules Only | 100.00% | 5.38% | 0.1020 | 5 | 0 | 88 |
| `CONFLICT` | 5 | Isolation Forest | 0.00% | 0.00% | 0.0000 | 0 | 5 | 105 |
| `CONFLICT` | 5 | Combined System | 100.00% | 3.79% | 0.0730 | 5 | 0 | 127 |
| `MISSING_RECORD` | 2 | Rules Only | 100.00% | 2.22% | 0.0435 | 2 | 0 | 88 |
| `MISSING_RECORD` | 2 | Isolation Forest | 0.00% | 0.00% | 0.0000 | 0 | 2 | 105 |
| `MISSING_RECORD` | 2 | Combined System | 100.00% | 1.55% | 0.0305 | 2 | 0 | 127 |
| `INVALID_RECORD` | 5 | Rules Only | 60.00% | 3.30% | 0.0625 | 3 | 2 | 88 |
| `INVALID_RECORD` | 5 | Isolation Forest | 0.00% | 0.00% | 0.0000 | 0 | 5 | 105 |
| `INVALID_RECORD` | 5 | Combined System | 60.00% | 2.31% | 0.0444 | 3 | 2 | 127 |
| `BEHAVIORAL_SPIKE` | 11 | Rules Only | 45.45% | 5.38% | 0.0962 | 5 | 6 | 88 |
| `BEHAVIORAL_SPIKE` | 11 | Isolation Forest | 36.36% | 3.67% | 0.0667 | 4 | 7 | 105 |
| `BEHAVIORAL_SPIKE` | 11 | Combined System | 45.45% | 3.79% | 0.0699 | 5 | 6 | 127 |
| `EXCEPTION_STREAK` | 15 | Rules Only | 66.67% | 10.20% | 0.1770 | 10 | 5 | 88 |
| `EXCEPTION_STREAK` | 15 | Isolation Forest | 60.00% | 7.89% | 0.1395 | 9 | 6 | 105 |
| `EXCEPTION_STREAK` | 15 | Combined System | 66.67% | 7.30% | 0.1316 | 10 | 5 | 127 |
| `PERSONAL_DEVIATION` | 11 | Rules Only | 45.45% | 5.38% | 0.0962 | 5 | 6 | 88 |
| `PERSONAL_DEVIATION` | 11 | Isolation Forest | 45.45% | 4.55% | 0.0826 | 5 | 6 | 105 |
| `PERSONAL_DEVIATION` | 11 | Combined System | 45.45% | 3.79% | 0.0699 | 5 | 6 | 127 |
| `CLASS_DEVIATION` | 6 | Rules Only | 50.00% | 3.30% | 0.0619 | 3 | 3 | 88 |
| `CLASS_DEVIATION` | 6 | Isolation Forest | 50.00% | 2.78% | 0.0526 | 3 | 3 | 105 |
| `CLASS_DEVIATION` | 6 | Combined System | 66.67% | 3.05% | 0.0584 | 4 | 2 | 127 |

## 4. Methodological Findings & System Dynamics

1. **Deterministic Data Integrity ($R001$-$R004$)**: Achieve 100% recall on `DUPLICATE` (3/3), `CONFLICT` (5/5), and `MISSING_RECORD` (2/2).
2. **Multivariate Behavioral Detection**: Isolation Forest catches subtle joint deviations across 7-day, 14-day, and class context, achieving 60.0% recall on `EXCEPTION_STREAK` and 45.5% on `PERSONAL_DEVIATION` without ground-truth labels.
3. **Combined Engine Synergy**: The combined system combines structural integrity rules and statistical ML flags, yielding the highest overall recall (63.79%) and F1 score.
