# Repository Data Policy Documentation

**Project**: Attendance Integrity System & Administrator Dashboard  
**Phase**: Phase 5C — Public Deployment Readiness  
**Date**: October 6, 2026  

---

## 1. Overview & Dataset Source

The project's underlying raw dataset originates from the Zenodo repository:
- **DOI**: [10.5281/zenodo.18902017](https://doi.org/10.5281/zenodo.18902017)
- **Dataset Title**: Public High School Student Attendance & Academic Performance Dataset

---

## 2. Directory Classification Policy

```text
data/
├── ground_truth/          # Offline evaluation artifacts (Never exposed operationally)
├── ml/                    # Feature matrices for train/val/test splits (Research tracking)
├── processed/             # Canonical attendance dataset & expected observations (Research tracking)
└── raw/
    └── zenodo/            # Source Excel workbooks (Research reproduction, not required by web app)
```

### Key Policies
1. **Raw Source Data**: `data/raw/zenodo/` contains research source files required only for running `scripts/build_dataset.py`. They are excluded from deployment web bundles.
2. **Evaluation Ground Truth**: `data/ground_truth/` contains ground truth target labels (`anomaly_labels.csv`, `injection_log.csv`). They are kept offline for evaluation testing (`tests/test_phase4_pipeline.py`) and are strictly separated from operational production application databases.
3. **Local Databases**: SQLite database files (`data/dashboard.db`, `data/test_dashboard.db`, `data/test_phase5c_db.sqlite`) are ignored by `.gitignore` to prevent committing local state.
