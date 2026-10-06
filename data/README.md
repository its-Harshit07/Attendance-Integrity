# Data Directory Structure & Repository Tracking Policy

**Project**: Attendance Integrity System & Administrator Dashboard  
**Dataset Source**: Zenodo Repository (DOI: [10.5281/zenodo.18902017](https://doi.org/10.5281/zenodo.18902017))  

---

## 1. Directory Structure Overview

```text
data/
├── ground_truth/          # Phase 4 evaluation datasets & injection log (Offline evaluation only)
│   ├── anomaly_labels.csv
│   ├── clean_evaluation.csv
│   ├── contaminated_evaluation.csv
│   └── injection_log.csv
├── ml/                    # Temporal features splits (train, validation, test)
│   ├── clean_evaluation_features.csv
│   ├── contaminated_evaluation_features.csv
│   ├── features.csv
│   ├── test.csv
│   ├── train.csv
│   └── validation.csv
├── processed/             # Canonical dataset & reference tables
│   ├── attendance_canonical.csv
│   ├── expected_observations.csv
│   ├── school_calendar.csv
│   └── student_master.csv
└── raw/
    └── zenodo/            # Source raw Zenodo Excel workbooks (Research reproduction)
        ├── standard_reports/
        └── student_attendance/
```

---

## 2. Repository Tracking & Deployment Policy

1. **Operational Runtime Independence**:
   - The deployed dashboard (FastAPI backend + PostgreSQL) does **NOT** require raw Zenodo source Excel workbooks at runtime. Operational data is served directly from PostgreSQL (`DATABASE_URL`).
2. **Research & Evaluation Artifacts**:
   - `data/ground_truth/`, `data/ml/`, and `data/processed/` are preserved for academic reproducibility and regression testing (`tests/test_phase4_pipeline.py`).
   - Ground-truth evaluation files (`anomaly_labels.csv`, `injection_log.csv`) are **NEVER** exposed via operational API routes or inserted into production application database tables.
3. **Local Databases Ignored**:
   - Local SQLite database files (`data/dashboard.db`, `data/test_dashboard.db`) are ignored by Git (`.gitignore`).
