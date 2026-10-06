# Phase 5C Demo Data Seeding & Data Isolation Documentation

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5C — PostgreSQL Migration & Public Deployment Readiness  
**Date**: October 6, 2026  

---

## 1. Executive Summary

Demonstration data in the operational database (`anomalies`, `evidence`, `reviews`, `audit_log`) is derived deterministically from Phase 4 evaluation outputs without exposing ground-truth target labels or injection metadata.

Seeding is executed via `scripts/seed_demo_data.py` targeting `DATABASE_URL` (PostgreSQL in production, SQLite in local fallback).

---

## 2. Seed Population & Risk Tier Interpretation

### Operational Demonstration Population (577 Flagged Signals)
| Risk Tier | Signal Count | Description & Review Guidance |
|---|---|---|
| **CRITICAL** | 21 | High-confidence deterministic rule violations (duplicate/conflict/invalid records). |
| **HIGH** | 86 | Severe behavioral deviations or high ML anomaly score ($\ge 0.90$). |
| **MEDIUM** | 57 | Moderate exception streaks or class-level behavioral spikes. |
| **LOW** | 413 | Low-confidence statistical variance signals ($0.70 \le \text{Score} < 0.90$). |
| **Total** | **577** | Total raw review signals populating demonstration database. |

### Metric Semantics Clarification
- **164 Actionable Review Signals**: The operational queue focuses on `CRITICAL` (21), `HIGH` (86), and `MEDIUM` (57) risk signals ($21 + 86 + 57 = 164$). This matches the Phase 4 combined system evaluation output ($TP=37 + FP=127 = 164$).
- **413 Baseline Variance Signals**: Represent low-risk baseline variance signals (`LOW` risk).

---

## 3. Data Isolation Rules

> [!IMPORTANT]
> **Strict Operational Isolation**:
> 1. Ground truth target files (`data/ground_truth/anomaly_labels.csv`, `injection_log.csv`, `contaminated_evaluation.csv`) are **NEVER** imported into operational database tables or exposed via operational API routes.
> 2. The seed script copies only non-privileged fields (`anomaly_id`, `student_id`, `class_id`, `date`, `raw_status`, `detection_source`, `risk_tier`, `anomaly_score`, `review_status`) into the operational database.
> 3. Synthetic injection IDs and ground-truth boolean labels (`is_anomaly`) remain strictly offline in `data/ground_truth/` for evaluation regression testing (`tests/test_phase4_pipeline.py`).
