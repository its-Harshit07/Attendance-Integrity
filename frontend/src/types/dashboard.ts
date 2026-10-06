export type RiskTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
export type ReviewStatus = 'UNREVIEWED' | 'UNDER_REVIEW' | 'VALIDATED' | 'REJECTED' | 'INVESTIGATE';
export type AnomalyCategory = 'DUPLICATE' | 'CONFLICT' | 'MISSING_RECORD' | 'INVALID_RECORD' | 'BEHAVIORAL_SPIKE' | 'EXCEPTION_STREAK' | 'PERSONAL_DEVIATION' | 'CLASS_DEVIATION';
export type DetectionSource = 'RULES' | 'ML' | 'COMBINED';

export interface Anomaly {
  anomaly_id: string;
  record_id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  date: string;
  attendance_status: string;
  raw_status: string;
  anomaly_category: AnomalyCategory;
  detection_source: DetectionSource;
  risk_tier: RiskTier;
  anomaly_score: number;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  evidence_id: number;
  anomaly_id: string;
  rule_id: string;
  rule_name: string;
  category: string;
  severity: string;
  observed_value: string;
  threshold_value: string;
  expected_value: string;
  explanation: string;
}

export interface Review {
  review_id: number;
  anomaly_id: string;
  reviewer: string;
  previous_status: string;
  new_status: string;
  note: string;
  timestamp: string;
}

export interface AuditLogEntry {
  audit_id: number;
  anomaly_id: string;
  action: string;
  previous_status: string;
  new_status: string;
  reviewer: string;
  note: string;
  timestamp: string;
}

export interface TemporalFeatures {
  exception_count_7d?: number;
  exception_rate_7d?: number;
  exception_rate_14d?: number;
  exception_rate_30d?: number;
  historical_exception_count?: number;
  historical_exception_rate?: number;
  consecutive_exception_days?: number;
  days_since_last_exception?: number;
  recent_vs_historical_deviation?: number;
  class_exception_rate_7d?: number;
  student_vs_class_deviation?: number;
}

export interface AnomalyDetail extends Anomaly {
  evidence: Evidence[];
  review_history: Review[];
  temporal_features?: TemporalFeatures;
}

export interface DashboardSummary {
  total_anomalies: number;
  unreviewed_count: number;
  under_review_count: number;
  validated_count: number;
  rejected_count: number;
  investigate_count: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  data_integrity_count: number;
  behavioral_count: number;
  rules_detected: number;
  ml_detected: number;
  combined_detected: number;
}

export interface SystemInfo {
  model_version: string;
  training_date_range: string;
  validation_date_range: string;
  test_date_range: string;
  random_seed: number;
  feature_count: number;
  feature_list: string[];
  operating_threshold_raw: number;
  production_rules: string[];
  phase4_tests_passed: string;
  experimental_integrity: string;
}

export interface ObservationTimelineItem {
  record_id: string;
  date: string;
  day_of_week: string;
  attendance_status: string;
  raw_status: string;
  is_school_day: string;
}

export interface StudentContext {
  student_id: string;
  student_name: string;
  class_id: string;
  total_evaluable_observations: number;
  source_exception_count: number;
  historical_exception_rate: number;
  anomaly_history_count: number;
  anomalies: Anomaly[];
  observation_timeline: ObservationTimelineItem[];
}
