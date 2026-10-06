# Feature Engineering & Profile Report

## 1. Feature Engineering Overview

- **Total Feature Rows Generated**: 10,706
- **Total Columns**: 28
- **Primary Key / Index**: (`student_id`, `date`)
- **Output File**: [features.csv](file:///d:/PROJECTS/ATTENDANCE_ANALYZER/data/ml/features.csv)

> [!IMPORTANT]
> **Strict Temporal Leakage Prevention**: All features for date $D$ are computed using observations strictly prior to date $D$ (`date < D`). The current day's status is never included in historical or rolling features.

## 2. Model Feature Usage Guidelines

To prevent model bias and shortcut learning, columns are partitioned as follows:

| Column Name | Category | Role in Machine Learning |
|---|---|---|
| `record_id` | Identifier | Metadata only; **DO NOT USE AS ML FEATURE** |
| `student_id` | Identifier | Metadata / Grouping key; **DO NOT USE AS ML FEATURE** |
| `student_number` | Identifier | Metadata only; **DO NOT USE AS ML FEATURE** |
| `student_name_anonymized` | Identifier | Metadata only; **DO NOT USE AS ML FEATURE** |
| `class_id` | Context | Categorical Context / Grouping |
| `date`, `month`, `day_of_week` | Context | Temporal Index |
| `is_school_day` | Context | Calendar State (`TRUE`, `FALSE`, `UNKNOWN`) |
| `exception_count_*`, `exception_rate_*` | Numerical Feature | Predictor / Model Input |
| `historical_*`, `consecutive_*` | Numerical Feature | Predictor / Model Input |
| `*_deviation` | Numerical Feature | Predictor / Model Input |

## 3. Feature Summary Statistics

| Feature Name | Missing Count | Min | Max | Mean | Std Dev |
|---|---|---|---|---|---|
| `exception_count_7d` | 0 | 0 | 5 | 0.1131 | 0.4272 |
| `exception_count_14d` | 0 | 0 | 7 | 0.2257 | 0.6338 |
| `exception_count_30d` | 0 | 0 | 8 | 0.4591 | 0.9698 |
| `evaluable_days_7d` | 0 | 0 | 5 | 4.8088 | 0.8287 |
| `evaluable_days_14d` | 0 | 0 | 10 | 9.3266 | 2.0881 |
| `evaluable_days_30d` | 0 | 0 | 22 | 18.5663 | 5.8826 |
| `exception_rate_7d` | 0 | 0.0 | 1.0 | 0.0226 | 0.0855 |
| `exception_rate_14d` | 0 | 0.0 | 0.7 | 0.0228 | 0.0638 |
| `exception_rate_30d` | 0 | 0.0 | 0.381 | 0.0222 | 0.0468 |
| `historical_exception_count` | 0 | 0 | 10 | 0.9686 | 1.6845 |
| `historical_evaluable_days` | 0 | 0 | 86 | 42.5769 | 25.1898 |
| `historical_exception_rate` | 0 | 0.0 | 0.3333 | 0.0186 | 0.0316 |
| `consecutive_exception_days` | 0 | 0 | 7 | 0.0314 | 0.2657 |
| `days_since_last_exception` | 0 | -1 | 110 | 8.9127 | 17.5159 |
| `recent_vs_historical_deviation` | 0 | -0.1818 | 0.878 | 0.004 | 0.0751 |
| `class_exception_rate_7d` | 0 | 0.0 | 0.3636 | 0.0226 | 0.0362 |
| `student_vs_class_deviation` | 0 | -0.3636 | 1.0 | 0.0 | 0.084 |

## 4. Detailed Feature Definitions & Mechanics

1. **`exception_count_7d / 14d / 30d`**: Count of source exception marks (`SOURCE_MARK_S`, `SOURCE_MARK_I`, `SOURCE_MARK_A`) in the 7, 14, or 30 calendar days strictly preceding date $D$.
2. **`evaluable_days_7d / 14d / 30d`**: Count of evaluable non-weekend days (`is_school_day != 'FALSE'`) in the lookback window.
3. **`exception_rate_7d / 14d / 30d`**: Ratio of `exception_count_*` to `evaluable_days_*`. Returns `0.0` if evaluable days equal 0.
4. **`historical_exception_count`**: Cumulative exception mark count for this student prior to date $D$.
5. **`historical_exception_rate`**: Cumulative exception rate for this student prior to date $D$.
6. **`consecutive_exception_days`**: Streak of consecutive evaluable school days immediately preceding date $D$ where an exception mark occurred.
7. **`days_since_last_exception`**: Calendar days elapsed since the student's most recent exception mark prior to date $D$ (-1 if no prior exception).
8. **`recent_vs_historical_deviation`**: Difference (`exception_rate_7d - historical_exception_rate`).
9. **`class_exception_rate_7d`**: Peer exception rate across all other students in the same `class_id` over the prior 7 days.
10. **`student_vs_class_deviation`**: Difference (`exception_rate_7d - class_exception_rate_7d`).

## 5. Temporal Leakage Verification Results

- **Lookback Boundary**: Strictly $[D - W, D - 1]$. Current day status $D$ is excluded.
- **Current-Day Contamination**: 0 instances detected in automated validation tests.
- **Weekend Opportunity Exclusion**: Weekend records (`is_school_day == 'FALSE'`) are excluded from evaluable attendance opportunity counts.
