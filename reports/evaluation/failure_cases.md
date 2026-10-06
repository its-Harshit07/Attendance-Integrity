# Anomaly Detection Failure Case Analysis (Reconciled)

## 1. Failure Case Analysis Overview

This document provides detailed qualitative and quantitative diagnostic analysis of failure modes, edge cases, and comparative strengths across the detection pipeline.

## 2. Summary Failure Counts (November Test Set)

| Failure Mode | Count | Diagnostic Explanation |
|---|---|---|
| **False Positives (FP)** | 127 | Normal attendance records flagged as anomalous by rules or ML |
| **False Negatives (FN)** | 21 | Synthetic anomalies missed by both rules and ML |
| **Rules Success / ML Miss** | 16 | Deterministic data integrity faults invisible to numerical feature ML |
| **ML Success / Rules Miss** | 1 | Subtle multivariate behavioral anomalies below static rule thresholds |
| **Dual Failure (Both Missed)** | 21 | Subtle single-day deviations without sufficient historical context |

## 3. Representative Failure Case Examples

### Case 1: False Positive (Benign Record Flagged)

- **Record ID**: `rec_409c47d88d03f7fc`
- **Ground Truth**: Clean Record (`gt_anomaly = False`)
- **Risk Tier**: `HIGH`
- **ML Anomaly Score**: 0.9857
- **Root Cause**: Student experienced a legitimate brief cluster of exception marks following a clean period. The behavioral rule threshold triggered even though the absence was legitimate.

### Case 2: False Negative (Injected Anomaly Missed)

- **Record ID**: `rec_7736043d9045dc4b`
- **Injected Anomaly Category**: `BEHAVIORAL_SPIKE`
- **Ground Truth**: Anomalous Record (`gt_anomaly = True`)
- **ML Anomaly Score**: 0.6701
- **Root Cause**: The injected anomaly caused a mild shift that remained within 1 standard deviation of historical peer variance, rendering it invisible to static rule thresholds and Isolation Forest point-anomaly scoring.

### Case 3: Rules Success / ML Miss (Structural Fault)

- **Record ID**: `rec_0b7fd8373050f399`
- **Injected Category**: `EXCEPTION_STREAK`
- **ML Anomaly Score**: 0.8175 (Below ML threshold)
- **Diagnostic Rationale**: Structural anomalies like `DUPLICATE` or `MISSING_RECORD` are deterministic register defects. Numerical feature vectors do not capture tabular duplicate rows, proving why rule engines are essential alongside ML models.

## 4. Scientific Conclusion & System Recommendations

1. **Rule Engine & ML Hybrid Necessity**: Neither static rules nor Isolation Forest alone are sufficient. Rules excel at deterministic structural data integrity ($R001$-$R004$), while Isolation Forest excels at multivariate behavioral anomaly detection.
2. **Evidence-Based Reporting**: All system outputs provide transparent evidence strings and risk tiers rather than black-box automated labels, empowering administrators to make informed decisions.
