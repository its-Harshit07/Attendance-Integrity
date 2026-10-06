# Known Issues Register (Before Functional Testing)

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: 5B — Production Hardening & Deployment Candidate  
**Date**: October 6, 2026  

---

## 1. Overview

This document records all currently observed functional and operational issues prior to post-deployment systematic functional testing. Per Phase 5B rules, these issues are logged here for future investigation and are **NOT** fixed during the production deployment candidate build phase.

---

## 2. Register of Known Issues

### Issue 1 — Audit Log "SYSTEM" Record Dependency
- **Symptom**: When the dashboard UI queries `/api/anomalies/SYSTEM/history` for audit history, if no anomaly record with ID `'SYSTEM'` exists in the `anomalies` table, the API returns a 404 response (`Anomaly record 'SYSTEM' not found`), causing a red error callout box in the frontend UI.
- **Root Cause**: The audit log history endpoint (`/anomalies/{anomaly_id}/history`) validates that `{anomaly_id}` exists in the `anomalies` table before returning `audit_log` records.
- **Status**: `KNOWN — TO BE INVESTIGATED AFTER DEPLOYMENT`
- **Action Plan**: During post-deployment functional testing, refine the system audit trail route to decouple system-wide audit history from specific anomaly ID lookups.

---

### Issue 2 — Dashboard Metric Semantics (577 Flagged Signals)
- **Symptom**: The main dashboard displays `577` as the total count of flagged anomaly records.
- **Underlying Breakdown**:
  - `Rules Only`: 38 signals
  - `ML Only`: 453 signals
  - `Combined`: 86 signals
  - Total: 577 signals (comprising 21 `CRITICAL`, 86 `HIGH`, 57 `MEDIUM`, and 413 `LOW` risk signals).
- **Context**: Out of 577 total raw signals, 164 records represent actionable **Review Signals** in `CRITICAL`, `HIGH`, or `MEDIUM` risk (matching Phase 4 combined system outputs $TP=37 + FP=127 = 164$). 413 records represent low-priority baseline statistical variance (`LOW` risk).
- **Status**: `KNOWN — TO BE INVESTIGATED AFTER DEPLOYMENT`
- **Action Plan**: Evaluate during post-deployment user testing whether low-risk statistical variance signals should be default-hidden or grouped in a separate queue tab.

---

### Issue 3 — Demonstration Review State Persistence
- **Symptom**: The dashboard overview may display existing validated/rejected review counts if test suites or past manual reviews mutate the demonstration database (`data/dashboard.db`).
- **Resolution in 5B**: Database test isolation has been verified so that `tests/test_phase5_dashboard.py` executes against `data/test_dashboard.db`, preserving `data/dashboard.db` in a clean, unreviewed demonstration state.
- **Status**: `KNOWN & ISOLATED — TO BE VERIFIED DURING DEPLOYMENT SMOKE CHECK`

---

## 3. Next Steps

1. Deploy the production candidate to the target environment.
2. Execute systematic post-deployment functional testing using these documented baseline cases.
