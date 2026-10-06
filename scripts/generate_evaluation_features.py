"""
Attendance Integrity System - Phase 4 Feature Generation & Temporal Dataset Split Script
File: scripts/generate_evaluation_features.py

Generates:
1. data/ml/clean_evaluation_features.csv
2. data/ml/contaminated_evaluation_features.csv
3. data/ml/train.csv (August + September clean features)
4. data/ml/validation.csv (October clean features)
5. data/ml/test.csv (November contaminated features)
"""

import os
import sys
import pandas as pd

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.data.feature_engineering import compute_temporal_features

CLEAN_EVAL_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "clean_evaluation.csv")
CONTAM_EVAL_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "contaminated_evaluation.csv")

ML_DIR = os.path.join(BASE_DIR, "data", "ml")
CLEAN_FEAT_PATH = os.path.join(ML_DIR, "clean_evaluation_features.csv")
CONTAM_FEAT_PATH = os.path.join(ML_DIR, "contaminated_evaluation_features.csv")

TRAIN_PATH = os.path.join(ML_DIR, "train.csv")
VAL_PATH = os.path.join(ML_DIR, "validation.csv")
TEST_PATH = os.path.join(ML_DIR, "test.csv")


def main():
    print("==================================================")
    print("REGENERATING EVALUATION FEATURES & TEMPORAL SPLITS")
    print("==================================================")

    print("\n1. Loading Clean Evaluation Dataset...")
    df_clean = pd.read_csv(CLEAN_EVAL_PATH)
    print(f"   -> Loaded {len(df_clean):,} clean evaluation records.")

    print("\n2. Computing Temporal Features for Clean Evaluation Data...")
    feat_clean = compute_temporal_features(df_clean)
    print(f"   -> Generated {len(feat_clean):,} clean feature rows.")

    print("\n3. Loading Contaminated Evaluation Dataset...")
    df_contam = pd.read_csv(CONTAM_EVAL_PATH)
    print(f"   -> Loaded {len(df_contam):,} contaminated evaluation records.")

    print("\n4. Computing Temporal Features for Contaminated Evaluation Data...")
    feat_contam = compute_temporal_features(df_contam)

    # Load Ground Truth Anomaly Labels
    df_labels = pd.read_csv(os.path.join(BASE_DIR, "data", "ground_truth", "anomaly_labels.csv"))
    gt_cols = df_labels[["record_id", "anomaly", "anomaly_type", "anomaly_event_id"]].copy()
    gt_cols.columns = ["record_id", "gt_is_anomaly", "gt_anomaly_category", "gt_anomaly_event_id"]

    feat_contam = feat_contam.merge(gt_cols, on="record_id", how="left")
    feat_contam["gt_is_anomaly"] = feat_contam["gt_is_anomaly"].fillna(False)
    feat_contam["gt_anomaly_category"] = feat_contam["gt_anomaly_category"].fillna("NONE")
    print(f"   -> Generated {len(feat_contam):,} contaminated feature rows (with ground truth metadata).")

    print("\n5. Exporting Evaluation Feature Files...")
    os.makedirs(ML_DIR, exist_ok=True)
    feat_clean.to_csv(CLEAN_FEAT_PATH, index=False)
    feat_contam.to_csv(CONTAM_FEAT_PATH, index=False)
    print(f"   -> Saved: {CLEAN_FEAT_PATH}")
    print(f"   -> Saved: {CONTAM_FEAT_PATH}")

    print("\n6. Creating Temporal Train/Validation/Test Splits...")

    # Train: August + September Clean Data (date < 2025-10-01)
    train_df = feat_clean[(feat_clean["date"] >= "2025-08-01") & (feat_clean["date"] <= "2025-09-30")].copy()
    train_df.to_csv(TRAIN_PATH, index=False)
    print(f"   -> Train Split (Aug + Sep Clean): {len(train_df):,} records saved to {TRAIN_PATH}")

    # Validation: October Clean Data (date >= 2025-10-01 and date <= 2025-10-31)
    val_df = feat_clean[(feat_clean["date"] >= "2025-10-01") & (feat_clean["date"] <= "2025-10-31")].copy()
    val_df.to_csv(VAL_PATH, index=False)
    print(f"   -> Validation Split (Oct Clean): {len(val_df):,} records saved to {VAL_PATH}")

    # Test: November Contaminated Data (date >= 2025-11-01 and date <= 2025-11-30)
    test_df = feat_contam[(feat_contam["date"] >= "2025-11-01") & (feat_contam["date"] <= "2025-11-30")].copy()
    test_df.to_csv(TEST_PATH, index=False)
    print(f"   -> Test Split (Nov Contaminated): {len(test_df):,} records saved to {TEST_PATH}")

    print("\n==================================================")
    print("FEATURE REGENERATION AND TEMPORAL SPLIT COMPLETE")
    print("==================================================")


if __name__ == "__main__":
    main()
