# Overview Metric Definitions & Operational Semantics

## 1. Executive Summary

This document establishes the precise operational definitions, calculation formulas, and source database queries for all administrator dashboard metrics.

---

## 2. Metric Definition Table

| Metric Label in UI | Database Source & Query | Operational Definition | Operational Unit | Deduplication Logic |
|---|---|---|---|---|
| **Review Signals** | `SELECT COUNT(*) FROM anomalies WHERE risk_tier IN ('CRITICAL', 'HIGH', 'MEDIUM')` | Unique student-date records flagged for human administrator review by production rules or statistical ML detector. | Unique student-date attendance observation records | Unique student-date record ID (**164 records**) |
| **Pending Review** | `SELECT COUNT(*) FROM anomalies WHERE review_status IN ('UNREVIEWED', 'UNDER_REVIEW') AND risk_tier IN ('CRITICAL', 'HIGH', 'MEDIUM')` | Review signals that are currently awaiting or undergoing human compliance review. | Unique student-date review records | Unique student-date record ID |
| **High Priority** | `SELECT COUNT(*) FROM anomalies WHERE risk_tier IN ('CRITICAL', 'HIGH') AND review_status IN ('UNREVIEWED', 'UNDER_REVIEW')` | Unresolved signals assigned `CRITICAL` or `HIGH` risk tier due to structural data integrity faults or multiple behavioral rule triggers. | Unique student-date review records | Unique student-date record ID |
| **Resolved Reviews** | `SELECT COUNT(*) FROM anomalies WHERE review_status IN ('VALIDATED', 'REJECTED')` | Signals where an administrator has submitted a final review decision (`VALIDATED` or `REJECTED`). | Unique student-date review records | Unique student-date record ID |
| **Data Integrity Faults** | `SELECT COUNT(*) FROM anomalies WHERE anomaly_category IN ('DUPLICATE', 'CONFLICT', 'MISSING_RECORD', 'INVALID_RECORD')` | Signals triggered by deterministic register integrity rules ($R001$–$R004$). | Unique student-date records | Unique student-date record ID (**21 records**) |
| **Behavioral Patterns** | `SELECT COUNT(*) FROM anomalies WHERE anomaly_category IN ('BEHAVIORAL_SPIKE', 'EXCEPTION_STREAK', 'PERSONAL_DEVIATION', 'CLASS_DEVIATION')` | Signals triggered by longitudinal behavioral rules ($R005$–$R008$) or Isolation Forest multivariate scoring. | Unique student-date records | Unique student-date record ID (**143 records**) |
| **Raw Detection Signals** | `SELECT COUNT(*) FROM anomalies` | Total raw detector outputs across all risk tiers, including low-priority statistical variance (`LOW` risk). | Individual detector signal outputs | Raw signals before risk filtering (**577 signals**) |

---

## 3. Reconciliation with Phase 4 Controlled Evaluation

- **Ground-Truth Positive Record Labels (Phase 4 Test)**: **58 positive records** in November (`gt_is_anomaly == True`).
- **Combined System Flags (Phase 4 Test)**: **164 total records** ($TP = 37$, $FP = 127$), corresponding to the 164 **Review Signals** (`CRITICAL`, `HIGH`, `MEDIUM` risk).
- **Raw Detection Signals (577 signals)**: Represents total raw detector outputs across the dataset including 413 low-priority statistical variance entries (`LOW` risk) where `anomaly_score >= 0.70` without rule triggers. In the UI, 577 is labeled **Raw Detection Signals (All Risk Tiers)** to prevent semantic confusion.
