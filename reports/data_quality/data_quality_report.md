# Data Quality & Ingestion Pipeline Report

## 1. Executive Summary

- **Source Workbooks Loaded**: 4
- **Sheets Processed**: 12
- **Total Unique Students**: 89
- **Total Classes**: 6
- **Total Months**: 4 (AGUSTUS, SEPTEMBER, OKTOBER, NOVEMBER)
- **Date Range**: 2025-08-01 to 2025-11-30
- **Canonical Observations Generated**: 10,706

## 2. Dataset Structure & Classes

| Class ID | Grade | anonymized_token | Total Students |
|---|---|---|---|
| `Kls 8_SISWA_032` | Kls 8 | `SISWA` | 19 |
| `Kls 8_SISWA_052` | Kls 8 | `SISWA` | 19 |
| `Kls 7_SISWA_017` | Kls 7 | `SISWA` | 14 |
| `Kls 7_SISWA_001` | Kls 7 | `SISWA` | 14 |
| `Kls 9_SISWA_072` | Kls 9 | `SISWA` | 12 |
| `Kls 9_SISWA_085` | Kls 9 | `SISWA` | 11 |

## 3. Raw Status Distribution & Preservation

| Raw Status Value | Meaning / Interpretation | Count | Normalized Attendance Status |
|---|---|---|---|
| *(blank / empty cell)* | Preserved verbatim from register | 10,533 | `NO_EXCEPTION_RECORDED` |
| `s` | Preserved verbatim from register | 147 | `SOURCE_MARK_S` |
| `i` | Preserved verbatim from register | 24 | `SOURCE_MARK_I` |
| `a` | Preserved verbatim from register | 2 | `SOURCE_MARK_A` |

## 4. Calendar Representation (`is_school_day`)

| `is_school_day` Value | Calendar Category | Days Count | Logic / Evidence |
|---|---|---|---|
| `TRUE` | Verified School Day | 63 | Weekdays with $\ge 1$ exception mark (`s`, `i`, `a`) recorded in register |
| `FALSE` | Weekend Day | 36 | Saturdays and Sundays |
| `UNKNOWN` | Unverified Weekday | 23 | Weekdays without explicit source calendar or exception evidence (no fabricated holidays) |

## 5. Automated Data Quality Verification Checks

| Verification Check | Result | Status |
|---|---|---|
| Missing Student IDs | 0 | PASSED |
| Duplicate Student Master Records | 0 | PASSED |
| Duplicate (Student, Date) Observations | 0 | PASSED |
| Unexpected / Malformed Marks | 0 | PASSED |
| Empty Sheets | 0 | PASSED |

## 6. Documented Pipeline Assumptions & Transformations

- Source Excel files are preserved strictly without modification.
- Header row detected dynamically by matching numeric date sequences (1, 2, 3...) in table rows.
- Raw attendance marks ('s', 'i', 'a', '') are preserved verbatim in raw_status.
- Blank cells are normalized to 'NO_EXCEPTION_RECORDED' and NOT assumed to mean 'PRESENT' without explicit evidence.
- Neutral status tokens ('SOURCE_MARK_S', 'SOURCE_MARK_I', 'SOURCE_MARK_A') are used in attendance_status.
- Calendar representations support TRUE, FALSE, UNKNOWN for is_school_day.
- Saturdays and Sundays are marked is_school_day = FALSE (Weekend).
- Weekdays with verified exception marks (s, i, a) recorded in source registers are marked is_school_day = TRUE.
- Weekdays with no exception evidence are marked is_school_day = UNKNOWN (no holidays fabricated).
- record_id generated deterministically using SHA-256 hash of (student_id + date).
