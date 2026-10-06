# Expected Observation Methodology

## 1. Overview & Purpose

The Expected Observation Framework establishes a formal, non-speculative model for determining whether an attendance observation **should** exist for any given `(student_id, date)` pair.

Rather than assuming every weekday is a school day or assuming every student registered in August must have a record on every date in November, this framework decouples **roster continuity**, **calendar state**, and **canonical observation existence**.

The resulting dataset is saved to: [expected_observations.csv](file:///d:/PROJECTS/ATTENDANCE_ANALYZER/data/processed/expected_observations.csv).

---

## 2. Core Variables & State Taxonomy

Each row in `expected_observations.csv` represents a student/date combination evaluated across four primary state dimensions:

### A. `calendar_state` (`TRUE`, `FALSE`, `UNKNOWN`)
- **`TRUE`** (63 dates): Weekdays (Monday-Friday) where at least one verified source exception mark (`s`, `i`, `a`) was recorded in the registers across any class.
- **`FALSE`** (36 dates): Saturdays and Sundays (Weekends).
- **`UNKNOWN`** (23 dates): Weekdays with zero recorded exception marks across all classes. Without an explicit master school calendar, these are preserved as `UNKNOWN` rather than fabricating holidays or assuming regular attendance days.

### B. `roster_active` (`TRUE`, `FALSE`)
- **`TRUE`**: Dates falling within the student's documented active months in the source registers.
- **`FALSE`**: Dates following a student's documented disappearance from the monthly source registers (e.g. `SISWA_089` in Sep–Nov; `SISWA_060` in Oct–Nov).

### C. `observation_exists` (`TRUE`, `FALSE`)
- **`TRUE`** (10,706 rows): The `(student_id, date)` record exists in `attendance_canonical.csv`.
- **`FALSE`** (152 rows): The `(student_id, date)` record is absent from `attendance_canonical.csv` due to roster non-activation/disappearance.

### D. `expectation_state` & `expected_observation`

| `roster_active` | `calendar_state` | `expectation_state` | `expected_observation` | Description & Policy |
|---|---|---|---|---|
| `TRUE` | `TRUE` | `EXPECTED` | `TRUE` | Student is active on roster and school day is verified. An observation **MUST** exist. |
| `TRUE` / `FALSE` | `FALSE` | `NOT_EXPECTED` | `FALSE` | Weekend date. Attendance is **NOT** expected. |
| `FALSE` | Any | `NOT_EXPECTED` | `FALSE` | Post-disappearance date. Attendance is **NOT** expected (roster non-active). |
| `TRUE` | `UNKNOWN` | `UNKNOWN` | `""` *(null)* | Weekday with no source schedule or exception evidence. Expectation state remains **UNKNOWN**. |

---

## 3. Summary of Dataset Population (10,858 Total Combinations)

Across all 89 unique students and 122 calendar days (2025-08-01 to 2025-11-30):

- **`EXPECTED` / `expected_observation = TRUE`**: 5,529 student-date observations (50.9%)
- **`NOT_EXPECTED` / `expected_observation = FALSE`**: 3,312 student-date observations (30.5%)
  - *Weekend non-expected*: 3,160
  - *Post-disappearance non-expected*: 152
- **`UNKNOWN` / `expected_observation = null`**: 2,017 student-date observations (18.6%)

---

## 4. Key Methodological Rules

### 1. Weekends Are Not Attendance Opportunities
Saturday and Sunday records (`calendar_state == FALSE`) have `expectation_state = NOT_EXPECTED`. They are excluded from rolling evaluable days and cannot be targeted for attendance expectations.

### 2. UNKNOWN Calendar Days Preserved Without Assumptions
Weekdays with 0 exception marks cannot automatically be converted into school days (`TRUE`) or holidays (`FALSE`). Their expectation state remains `UNKNOWN` and `expected_observation` remains `null`.

### 3. Roster Disappearance Does Not Imply Missing Records
When a student disappears from subsequent monthly registers (`roster_active == FALSE`), dates after their last active month are marked `NOT_EXPECTED` (`FALSE`). They are **NOT** classified as missing records or anomalies.

### 4. Eligibility Rule for Missing-Record Anomaly Injections
Synthetic `MISSING_RECORD` anomaly injections in downstream evaluation frameworks are **STRICTLY ELIGIBLE ONLY** on records where `expected_observation == TRUE`.
- Records with `expected_observation == FALSE` (weekends or post-disappearance) are **EXCLUDED**.
- Records with `expected_observation == null` (`UNKNOWN` calendar days) are **EXCLUDED**.
