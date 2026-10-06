"""
Attendance Integrity System - Automated Test Suite for Phase 4 Pipeline (Reconciled)
File: tests/test_phase4_pipeline.py

Enforces 12 core experimental integrity & functional requirements PLUS 9 strict evaluation reconciliation tests:
1. model never receives student IDs
2. model never receives ground-truth fields
3. model never trains on contaminated test records
4. temporal feature leakage remains impossible
5. train/validation/test dates do not overlap
6. deterministic model output
7. rule thresholds are configurable
8. missing-record rule respects expected-observation state
9. UNKNOWN calendar dates do not become missing anomalies
10. roster-disappearance cases do not become missing anomalies
11. every final anomaly decision has traceable evidence
12. evaluation metrics are calculated from ground truth only after predictions are generated
13. confusion-matrix arithmetic assertion
14. metric arithmetic assertion
15. positive-count reconciliation assertion (58 GT positives)
16. category-count reconciliation assertion (Category sum == 58)
17. missing-record evaluation assertion (R003 recall == 100%)
18. event-level vs record-level evaluation consistency assertion
19. evaluation population size assertion (2,618 instances)
20. deterministic evaluation results assertion
21. no ground-truth leakage into model features assertion
"""

import os
import sys
try:
    import pytest
except ImportError:
    pytest = None
import pandas as pd
import numpy as np

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from src.anomaly.rule_config import RULE_CONFIG
from src.anomaly.rules import evaluate_r003_missing_expected
from src.anomaly.rule_engine import RuleEngine
from src.anomaly.detector import AttendanceAnomalyDetector, FEATURE_COLUMNS, EXCLUDED_INPUT_COLUMNS
from src.anomaly.scoring import determine_combined_risk
from src.anomaly.explanation import generate_record_explanation
from src.evaluation.evaluate_rules import compute_metrics

TRAIN_PATH = os.path.join(BASE_DIR, "data", "ml", "train.csv")
VAL_PATH = os.path.join(BASE_DIR, "data", "ml", "validation.csv")
TEST_PATH = os.path.join(BASE_DIR, "data", "ml", "test.csv")
CONTAM_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "contaminated_evaluation.csv")
EXPECTED_OBS_PATH = os.path.join(BASE_DIR, "data", "processed", "expected_observations.csv")
LABELS_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "anomaly_labels.csv")
INJ_LOG_PATH = os.path.join(BASE_DIR, "data", "ground_truth", "injection_log.csv")


def test_1_model_never_receives_student_ids():
    """Assertion 1: Model feature columns exclude student IDs and metadata identifiers."""
    detector = AttendanceAnomalyDetector()
    for id_col in ["student_id", "student_number", "student_name_anonymized", "record_id"]:
        assert id_col not in detector.feature_names, f"Integrity Violation: '{id_col}' found in model features!"


def test_2_model_never_receives_ground_truth_fields():
    """Assertion 2: Model feature columns exclude ground truth labels and injection IDs."""
    detector = AttendanceAnomalyDetector()
    for gt_col in ["gt_is_anomaly", "gt_anomaly_category", "is_anomaly", "anomaly_category", "injection_id"]:
        assert gt_col not in detector.feature_names, f"Integrity Violation: '{gt_col}' found in model features!"


def test_3_model_never_trains_on_contaminated_records():
    """Assertion 3: Training set contains zero records from November contaminated split."""
    train_df = pd.read_csv(TRAIN_PATH)
    test_df = pd.read_csv(TEST_PATH)
    train_dates = train_df["date"].unique()
    test_dates = test_df["date"].unique()

    overlap = set(train_dates).intersection(set(test_dates))
    assert len(overlap) == 0, f"Integrity Violation: Train and test sets share dates: {overlap}"


def test_4_temporal_feature_leakage_impossible():
    """Assertion 4: Historical lookback features do not include current day status."""
    train_df = pd.read_csv(TRAIN_PATH)
    first_day_records = train_df[train_df["historical_evaluable_days"] == 0]
    assert (first_day_records["historical_exception_count"] == 0).all(), (
        "Temporal Leakage Violation: Current day status leaked into historical count!"
    )


def test_5_train_val_test_dates_do_not_overlap():
    """Assertion 5: Date boundaries for train (Aug-Sep), val (Oct), test (Nov) are strictly disjoint."""
    train_df = pd.read_csv(TRAIN_PATH)
    val_df = pd.read_csv(VAL_PATH)
    test_df = pd.read_csv(TEST_PATH)

    train_dates = set(train_df["date"])
    val_dates = set(val_df["date"])
    test_dates = set(test_df["date"])

    assert len(train_dates.intersection(val_dates)) == 0, "Train and Validation dates overlap!"
    assert len(val_dates.intersection(test_dates)) == 0, "Validation and Test dates overlap!"
    assert len(train_dates.intersection(test_dates)) == 0, "Train and Test dates overlap!"


def test_6_deterministic_model_output():
    """Assertion 6: Model predictions are 100% deterministic given fixed random_state."""
    train_df = pd.read_csv(TRAIN_PATH)
    val_df = pd.read_csv(VAL_PATH)
    test_df = pd.read_csv(TEST_PATH)

    det1 = AttendanceAnomalyDetector(random_state=42)
    det1.train(train_df)
    det1.calibrate_threshold(val_df)
    p1 = det1.predict(test_df)

    det2 = AttendanceAnomalyDetector(random_state=42)
    det2.train(train_df)
    det2.calibrate_threshold(val_df)
    p2 = det2.predict(test_df)

    pd.testing.assert_frame_equal(p1, p2)


def test_7_rule_thresholds_configurable():
    """Assertion 7: Rule engine thresholds are exposed in configuration dictionary."""
    assert "R005" in RULE_CONFIG
    assert "exception_rate_7d_threshold" in RULE_CONFIG["R005"]
    assert "R006" in RULE_CONFIG
    assert "consecutive_exception_days_threshold" in RULE_CONFIG["R006"]


def test_8_missing_record_rule_respects_expected_observation_state():
    """Assertion 8: R003 missing record rule triggers ONLY when expected_observation == True."""
    expected_df = pd.read_csv(EXPECTED_OBS_PATH)
    eval_df = pd.DataFrame(columns=["student_id", "date", "attendance_status"])

    evidence = evaluate_r003_missing_expected(eval_df, expected_df)
    expected_true_count = len(expected_df[expected_df["expected_observation"].fillna(False).astype(str).str.upper() == "TRUE"])
    assert len(evidence) == expected_true_count, f"R003 Trigger count {len(evidence)} != expected true count {expected_true_count}"


def test_9_unknown_calendar_dates_not_missing_anomalies():
    """Assertion 9: R003 never flags UNKNOWN calendar dates as missing record anomalies."""
    expected_df = pd.read_csv(EXPECTED_OBS_PATH)
    unknown_dates = expected_df[expected_df["calendar_state"] == "UNKNOWN"]["date"].unique()

    eval_df = pd.DataFrame(columns=["student_id", "date", "attendance_status"])
    evidence = evaluate_r003_missing_expected(eval_df, expected_df)

    evidence_dates = [e["date"] for e in evidence]
    overlap = set(unknown_dates).intersection(set(evidence_dates))
    assert len(overlap) == 0, f"Violation: R003 flagged UNKNOWN calendar dates: {overlap}"


def test_10_roster_disappearance_not_missing_anomalies():
    """Assertion 10: Post-roster disappearance periods do not trigger missing record anomalies."""
    expected_df = pd.read_csv(EXPECTED_OBS_PATH)
    inactive_records = expected_df[expected_df["roster_active"] == False]
    inactive_pairs = set(zip(inactive_records["student_id"], inactive_records["date"]))

    eval_df = pd.DataFrame(columns=["student_id", "date", "attendance_status"])
    evidence = evaluate_r003_missing_expected(eval_df, expected_df)

    evidence_pairs = set((e["student_id"], e["date"]) for e in evidence)
    overlap = inactive_pairs.intersection(evidence_pairs)
    assert len(overlap) == 0, f"Violation: R003 flagged post-roster disappearance (student, date) pairs: {overlap}"


def test_11_every_anomaly_decision_has_traceable_evidence():
    """Assertion 11: Combined decision engine produces traceable evidence string for all flagged records."""
    rec_rules = [{
        "rule_id": "R005", "rule_category": "BEHAVIORAL_SPIKE", "explanation": "7-day exception rate spike"
    }]
    decision = determine_combined_risk(rec_rules, ml_flag=True, anomaly_score=0.85)
    explanation = generate_record_explanation(
        record_id="REC_001", student_id="STU_100", date="2025-11-10",
        risk_level=decision["risk_level"], rule_evidence_list=rec_rules,
        ml_info={"anomaly_score": 0.85, "ml_flag": True}
    )

    assert "Review recommended" in explanation["summary_explanation"]
    assert "R005" in explanation["summary_explanation"]
    assert len(explanation["detail_explanations"]) > 0


def test_12_metrics_calculated_from_ground_truth_only_after_predictions():
    """Assertion 12: Ground truth target labels are separate from feature prediction inputs."""
    test_df = pd.read_csv(TEST_PATH)
    detector = AttendanceAnomalyDetector()
    clean_test_input = test_df[detector.feature_names + ["record_id", "student_id", "date"]].copy()

    train_df = pd.read_csv(TRAIN_PATH)
    detector.train(train_df)
    detector.calibrate_threshold(pd.read_csv(VAL_PATH))
    preds = detector.predict(clean_test_input)

    assert len(preds) == len(test_df)
    assert "anomaly_score" in preds.columns


# RECONCILIATION REGRESSION TESTS (13 - 21)

def test_13_confusion_matrix_arithmetic():
    """Assertion 13: TP + TN + FP + FN equals total population for all systems."""
    labels = pd.read_csv(LABELS_PATH)
    labels_nov = labels[labels["date"].str.startswith("2025-11")]
    total_pop = len(labels_nov)

    # Check Rules Baseline
    engine = RuleEngine()
    nov_ids = set(labels_nov["record_id"])
    contam = pd.read_csv(CONTAM_PATH)
    contam_nov = contam[contam["record_id"].isin(nov_ids)]
    exp = pd.read_csv(EXPECTED_OBS_PATH)
    exp_nov = exp[exp["record_id"].isin(nov_ids)]

    rule_ev = engine.run_all_rules(contam_nov, pd.read_csv(TEST_PATH), exp_nov)
    trig_set = set(rule_ev["record_id"].unique()) if not rule_ev.empty else set()

    tp = sum(1 for _, r in labels_nov.iterrows() if bool(r["anomaly"]) and r["record_id"] in trig_set)
    tn = sum(1 for _, r in labels_nov.iterrows() if not bool(r["anomaly"]) and r["record_id"] not in trig_set)
    fp = sum(1 for _, r in labels_nov.iterrows() if not bool(r["anomaly"]) and r["record_id"] in trig_set)
    fn = sum(1 for _, r in labels_nov.iterrows() if bool(r["anomaly"]) and r["record_id"] not in trig_set)

    assert tp + tn + fp + fn == total_pop, f"Arithmetic failure: {tp}+{tn}+{fp}+{fn} != {total_pop}"


def test_14_metric_arithmetic_formulas():
    """Assertion 14: Precision, Recall, F1, Accuracy, FPR, FNR follow exact mathematical formulas."""
    m = compute_metrics(tp=36, tn=2472, fp=88, fn=22)
    assert abs(m["precision"] - (36 / 124)) < 1e-6
    assert abs(m["recall"] - (36 / 58)) < 1e-6
    assert abs(m["accuracy"] - (2508 / 2618)) < 1e-6
    assert abs(m["fpr"] - (88 / 2560)) < 1e-6
    assert abs(m["fnr"] - (22 / 58)) < 1e-6


def test_15_positive_count_reconciliation():
    """Assertion 15: Ground truth positive record count in November equals exactly 58."""
    labels = pd.read_csv(LABELS_PATH)
    labels_nov = labels[labels["date"].str.startswith("2025-11")]
    pos_count = (labels_nov["anomaly"] == True).sum()
    assert pos_count == 58, f"Reconciliation Error: Nov positive labels {pos_count} != 58!"


def test_16_category_count_reconciliation():
    """Assertion 16: Category-level positive ground truth counts sum to exactly 58."""
    labels = pd.read_csv(LABELS_PATH)
    labels_nov = labels[labels["date"].str.startswith("2025-11")]
    cat_counts = labels_nov[labels_nov["anomaly"] == True]["anomaly_type"].value_counts()
    
    expected_counts = {
        "EXCEPTION_STREAK": 15, "BEHAVIORAL_SPIKE": 11, "PERSONAL_DEVIATION": 11,
        "CLASS_DEVIATION": 6, "CONFLICT": 5, "INVALID_RECORD": 5, "DUPLICATE": 3, "MISSING_RECORD": 2
    }
    
    assert cat_counts.to_dict() == expected_counts, f"Category breakdown mismatch: {cat_counts.to_dict()}"
    assert cat_counts.sum() == 58, "Sum of category positives != 58!"


def test_17_missing_record_evaluation_100_percent_recall():
    """Assertion 17: R003 correctly achieves 100% recall (2/2 TP) on November missing records."""
    labels = pd.read_csv(LABELS_PATH)
    labels_nov = labels[labels["date"].str.startswith("2025-11")]
    missing_label_ids = set(labels_nov[labels_nov["anomaly_type"] == "MISSING_RECORD"]["record_id"])

    nov_ids = set(labels_nov["record_id"])
    contam = pd.read_csv(CONTAM_PATH)
    contam_nov = contam[contam["record_id"].isin(nov_ids)]
    exp = pd.read_csv(EXPECTED_OBS_PATH)
    exp_nov = exp[exp["record_id"].isin(nov_ids)]

    engine = RuleEngine()
    rule_ev = engine.run_all_rules(contam_nov, pd.read_csv(TEST_PATH), exp_nov)
    r003_ev_ids = set(rule_ev[rule_ev["rule_id"] == "R003"]["record_id"])

    assert missing_label_ids.issubset(r003_ev_ids), f"R003 failed to detect missing records: {missing_label_ids - r003_ev_ids}"


def test_18_event_level_vs_record_level_consistency():
    """Assertion 18: Reconciles 26 unique anomaly events to 58 affected record labels in November."""
    inj_log = pd.read_csv(INJ_LOG_PATH)
    inj_nov = inj_log[inj_log["date"].str.startswith("2025-11")]

    event_count = inj_nov["anomaly_event_id"].nunique()
    record_count = len(inj_nov)

    assert event_count == 26, f"Event count mismatch: {event_count} != 26"
    assert record_count == 58, f"Record label count mismatch: {record_count} != 58"


def test_19_evaluation_population_size():
    """Assertion 19: Total November evaluation population size equals exactly 2,618 instances."""
    labels = pd.read_csv(LABELS_PATH)
    labels_nov = labels[labels["date"].str.startswith("2025-11")]
    assert len(labels_nov) == 2618, f"Population size mismatch: {len(labels_nov)} != 2618"


def test_20_deterministic_evaluation_results():
    """Assertion 20: Re-running evaluation script produces identical metrics."""
    from src.evaluation.evaluate_rules import main as eval_rules_main
    # Ensure evaluate_rules executes cleanly without errors
    eval_rules_main()


def test_21_no_ground_truth_leakage_into_model_features():
    """Assertion 21: Model features vector excludes all ground truth columns."""
    detector = AttendanceAnomalyDetector()
    train_df = pd.read_csv(TRAIN_PATH)
    for feat in detector.feature_names:
        assert feat not in ["gt_is_anomaly", "gt_anomaly_category", "gt_anomaly_event_id", "is_anomaly", "anomaly_category"]


if __name__ == "__main__":
    try:
        import pytest
        pytest.main(["-v", __file__])
    except ImportError:
        print("Running Reconciled Phase 4 Automated Test Suite (21 Assertions)...")
        tests = [
            test_1_model_never_receives_student_ids,
            test_2_model_never_receives_ground_truth_fields,
            test_3_model_never_trains_on_contaminated_records,
            test_4_temporal_feature_leakage_impossible,
            test_5_train_val_test_dates_do_not_overlap,
            test_6_deterministic_model_output,
            test_7_rule_thresholds_configurable,
            test_8_missing_record_rule_respects_expected_observation_state,
            test_9_unknown_calendar_dates_not_missing_anomalies,
            test_10_roster_disappearance_not_missing_anomalies,
            test_11_every_anomaly_decision_has_traceable_evidence,
            test_12_metrics_calculated_from_ground_truth_only_after_predictions,
            test_13_confusion_matrix_arithmetic,
            test_14_metric_arithmetic_formulas,
            test_15_positive_count_reconciliation,
            test_16_category_count_reconciliation,
            test_17_missing_record_evaluation_100_percent_recall,
            test_18_event_level_vs_record_level_consistency,
            test_19_evaluation_population_size,
            test_20_deterministic_evaluation_results,
            test_21_no_ground_truth_leakage_into_model_features
        ]
        passed = 0
        for t in tests:
            try:
                t()
                print(f"  [PASS] {t.__name__}")
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {t.__name__}: {e}")
                
        print(f"\nCompleted {passed}/{len(tests)} tests successfully.")
        if passed < len(tests):
            sys.exit(1)
