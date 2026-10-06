# Evaluation Data Contract & Schema Specification

## 1. Overview & Data Architecture

The Evaluation Framework establishes an immutable data contract governing synthetic anomaly injection, ground-truth labeling, and model evaluation metrics.

The architecture decouples **real canonical data** from **synthetic evaluation data** across four primary files:

```
data/ground_truth/
├── clean_evaluation.csv         # Exact baseline copy of attendance_canonical.csv (10,706 rows)
├── contaminated_evaluation.csv  # Contaminated dataset with controlled injections (10,721 rows)
├── anomaly_labels.csv           # Comprehensive ground-truth labels (10,736 rows)
└── injection_log.csv            # Detailed audit log of injection actions (110 rows)
```

> [!IMPORTANT]
> **Source Data Protection**: The real canonical dataset (`attendance_canonical.csv`) remains **100% UNMODIFIED** (verified by SHA-256 hash checking before and after injection).

---

## 2. Formal Dataset Arithmetic Reconciliation

The relationship between clean records, synthetic modifications, contaminated records, and ground-truth labels satisfies the following strict arithmetic equations:

$$ \text{CONTAMINATED\_ROWS} = \text{CLEAN\_ROWS} + \text{ADDED\_ROWS} - \text{REMOVED\_ROWS} $$
$$ 10,721 = 10,706 + 30 - 15 $$

$$ \text{GROUND\_TRUTH\_LABEL\_ROWS} = \text{CLEAN\_ROWS} + \text{ADDED\_ROWS} $$
$$ 10,736 = 10,706 + 30 $$

$$ \text{POSITIVE\_ANOMALY\_LABELS} = \text{REMOVED\_ROWS} + \text{MODIFIED\_ROWS} + \text{ADDED\_ROWS} $$
$$ 250 = 15 + 205 + 30 $$

$$ \text{LEGITIMATE\_NEGATIVE\_LABELS} = \text{UNTOUCHED\_CLEAN\_ROWS} $$
$$ 10,486 = 10,706 - 15 - 205 $$

| Metric Name | Count | Explanation / Formula |
|---|---|---|
| **Clean Baseline Rows** | `10,706` | Real canonical student/date observations |
| **Added Rows** | `+30` | 15 `DUPLICATE` + 15 `CONFLICT` synthetic observations |
| **Removed Rows** | `-15` | 15 `MISSING_RECORD` expected observations removed |
| **Modified Rows (In-Place)** | `205` | Existing records modified (15 `INVALID_RECORD` + 40 `BEHAVIORAL_SPIKE` + 60 `EXCEPTION_STREAK` + 50 `PERSONAL_DEVIATION` + 40 `CLASS_DEVIATION`) |
| **Untouched Clean Rows** | `10,486` | Real source observations left completely unmodified |
| **Contaminated Dataset Rows** | `10,721` | Final evaluation dataset (`10,706 + 30 - 15`) |
| **Ground-Truth Label Rows** | `10,736` | Full label population (`10,706 + 30`) |
| **Unique Anomaly Events** | `100` | Distinct injection actions (100 events) |
| **Positive Anomaly Labels** | `250` | Records labeled `anomaly = TRUE` (`15 + 205 + 30`) |
| **Legitimate Negative Labels** | `10,486` | Records labeled `anomaly = FALSE` (`10,486`) |

---

## 3. Event vs. Record Mapping Contract

The framework explicitly distinguishes **Row-Level Anomalies** (single row modified/added/removed) from **Event/Pattern-Level Anomalies** (multi-day behavioral pattern affecting multiple consecutive records of a student).

- **`injection_id`**: Unique identifier for the injection operation (`inj_001` .. `inj_100`).
- **`anomaly_event_id`**: Unique identifier for the anomaly event (`evt_001` .. `evt_100`).
- **`record_id`**: Specific observation ID affected by the injection.

### Concrete Example: Multi-Day Pattern Event (`EXCEPTION_STREAK`)
Suppose Event `evt_061` (`inj_061`) injects a consecutive source-exception streak of 6 `SOURCE_MARK_S` marks for student `STU_104463` across 6 school days:

```
injection_log.csv:
injection_id | anomaly_event_id | anomaly_type     | student_id | date       | original_record_id          | modified_record_id
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-04 | rec_8f7a...1a              | rec_8f7a...1a
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-05 | rec_9b2c...3b              | rec_9b2c...3b
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-06 | rec_4d1e...5c              | rec_4d1e...5c
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-07 | rec_1f8a...8d              | rec_1f8a...8d
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-08 | rec_3e7f...9e              | rec_3e7f...9e
inj_061      | evt_061          | EXCEPTION_STREAK | STU_104463 | 2025-08-11 | rec_2a5b...0f              | rec_2a5b...0f

anomaly_labels.csv:
record_id    | student_id | date       | anomaly | anomaly_type     | injection_id | anomaly_event_id | ground_truth_source
rec_8f7a...  | STU_104463 | 2025-08-04 | TRUE    | EXCEPTION_STREAK | inj_061      | evt_061          | SYNTHETIC_INJECTION
rec_9b2c...  | STU_104463 | 2025-08-05 | TRUE    | EXCEPTION_STREAK | inj_061      | evt_061          | SYNTHETIC_INJECTION
...
```

All 6 affected records reference the same `anomaly_event_id` (`evt_061`) and `injection_id` (`inj_061`).

---

## 4. Ground-Truth Data Isolation & Safety Contract

1. **Feature Isolation**: Ground-truth label columns (`anomaly`, `anomaly_type`, `injection_id`, `anomaly_event_id`, `ground_truth_source`) exist **ONLY** in `anomaly_labels.csv` and `injection_log.csv`. They are **STRICTLY EXCLUDED** from model feature sets (`features.csv`).
2. **Missing Record Tracking**: A `MISSING_RECORD` anomaly removes a record from `contaminated_evaluation.csv`, but retains a ground-truth label entry in `anomaly_labels.csv` with `anomaly = TRUE`, `anomaly_type = MISSING_RECORD`, and `ground_truth_source = SYNTHETIC_INJECTION`.
3. **Negative Baseline**: Legitimate source exceptions (`s`, `i`, `a`) in the real dataset remain strictly labeled `anomaly = FALSE`, `ground_truth_source = REAL_SOURCE` unless explicitly modified by an injected event.
4. **Reproducibility**: All injections are generated deterministically using `RANDOM_SEED = 42`.
