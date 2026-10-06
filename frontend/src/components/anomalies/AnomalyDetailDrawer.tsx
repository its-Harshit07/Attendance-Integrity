import React, { useState, useEffect } from 'react';
import type { AnomalyDetail } from '../../types/dashboard';
import { updateReviewStatus } from '../../api/client';

interface DetailDrawerProps {
  anomaly: AnomalyDetail | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
  onViewStudentContext: (studentId: string) => void;
}

export const AnomalyDetailDrawer: React.FC<DetailDrawerProps> = ({
  anomaly,
  onClose,
  onReviewSubmitted,
  onViewStudentContext
}) => {
  const [newStatus, setNewStatus] = useState<string>('VALIDATED');
  const [reviewer, setReviewer] = useState<string>('Administrator (Dev)');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (anomaly) {
      setNewStatus(anomaly.review_status === 'UNREVIEWED' ? 'VALIDATED' : anomaly.review_status);
      setNote('');
      setErrorMsg(null);
    }
  }, [anomaly]);

  if (!anomaly) return null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMsg('Please enter a review rationale/note before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateReviewStatus(anomaly.anomaly_id, newStatus, note, reviewer);
      setSubmitting(false);
      onReviewSubmitted();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit review');
    }
  };

  const getRecommendation = () => {
    if (anomaly.risk_tier === 'CRITICAL' || anomaly.risk_tier === 'HIGH') {
      return {
        action: 'VALIDATE',
        text: 'Actionable anomaly detected with high confidence or explicit rule triggers. Recommended action is to VALIDATE and flag for attendance record correction or administrative intervention.',
        bgColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        textColor: '#1E40AF'
      };
    } else if (anomaly.risk_tier === 'MEDIUM') {
      return {
        action: 'INVESTIGATE',
        text: 'Moderate anomaly signal. Recommended action is to INVESTIGATE student historical context or check for excused absence documentation before resolving.',
        bgColor: '#FFFBEB',
        borderColor: '#FDE68A',
        textColor: '#92400E'
      };
    } else {
      return {
        action: 'REJECT / DISMISS',
        text: 'Low risk statistical variance without explicit rule triggers. Recommended action is to REJECT or DISMISS as non-actionable baseline variation.',
        bgColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        textColor: '#475569'
      };
    }
  };

  const rec = getRecommendation();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 200,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '90vw',
          height: '100%',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Anomaly Review Detail
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', fontFamily: 'monospace' }}>
              {anomaly.anomaly_id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#64748B',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem'
            }}
          >
            &times;
          </button>
        </div>

        {/* Drawer Body Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Student Profile Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B' }}>{anomaly.student_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.15rem' }}>
                Student ID: <span style={{ fontWeight: 600 }}>{anomaly.student_id}</span> • Class:{' '}
                <span style={{ fontWeight: 600 }}>{anomaly.class_id}</span> • Date:{' '}
                <span style={{ fontWeight: 600 }}>{anomaly.date}</span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onViewStudentContext(anomaly.student_id);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                backgroundColor: '#FFFFFF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              View Student Context &rarr;
            </button>
          </div>

          {/* Anomaly Key Specs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div style={{ border: '1px solid #E5E7EB', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Risk Tier</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                {anomaly.risk_tier}
              </div>
            </div>
            <div style={{ border: '1px solid #E5E7EB', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Category</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '0.2rem' }}>
                {anomaly.anomaly_category}
              </div>
            </div>
            <div style={{ border: '1px solid #E5E7EB', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Anomaly Score</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563EB', marginTop: '0.2rem' }}>
                {anomaly.anomaly_score.toFixed(4)}
              </div>
            </div>
          </div>

          {/* Human Decision Recommendation Callout */}
          <div
            style={{
              backgroundColor: rec.bgColor,
              border: `1px solid ${rec.borderColor}`,
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: rec.textColor, marginBottom: '0.35rem' }}>
              Decision Support Recommendation: {rec.action}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>{rec.text}</div>
          </div>

          {/* Triggered Evidence Rules */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.75rem 0' }}>
              Triggered Evidence & Rules
            </h4>
            {anomaly.evidence && anomaly.evidence.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {anomaly.evidence.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>
                        {ev.rule_id}: {ev.rule_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: ev.severity === 'CRITICAL' ? '#FFE1E1' : '#FFF1CC',
                          color: ev.severity === 'CRITICAL' ? '#991B1B' : '#9A3412',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px'
                        }}
                      >
                        {ev.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.35rem' }}>
                      {ev.explanation}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        fontSize: '0.75rem',
                        color: '#64748B',
                        backgroundColor: '#F8FAFC',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      <span>
                        Observed: <strong style={{ color: '#1E293B' }}>{ev.observed_value}</strong>
                      </span>
                      <span>
                        Expected: <strong style={{ color: '#1E293B' }}>{ev.expected_value}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic' }}>
                No explicit deterministic rules triggered (Detected via Isolation Forest ML statistical deviation score{' '}
                {anomaly.anomaly_score.toFixed(4)}).
              </div>
            )}
          </div>

          {/* Temporal Features Context */}
          {anomaly.temporal_features && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.75rem 0' }}>
                Temporal Feature Context
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '6px' }}>
                  <span style={{ color: '#64748B' }}>7-Day Exception Rate:</span>{' '}
                  <strong style={{ color: '#1E293B' }}>
                    {((anomaly.temporal_features.exception_rate_7d || 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '6px' }}>
                  <span style={{ color: '#64748B' }}>14-Day Exception Rate:</span>{' '}
                  <strong style={{ color: '#1E293B' }}>
                    {((anomaly.temporal_features.exception_rate_14d || 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '6px' }}>
                  <span style={{ color: '#64748B' }}>30-Day Exception Rate:</span>{' '}
                  <strong style={{ color: '#1E293B' }}>
                    {((anomaly.temporal_features.exception_rate_30d || 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '6px' }}>
                  <span style={{ color: '#64748B' }}>Consecutive Exception Days:</span>{' '}
                  <strong style={{ color: '#1E293B' }}>
                    {anomaly.temporal_features.consecutive_exception_days || 0}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Human Review Decision Form */}
          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.85rem 0' }}>
              Human Decision Action
            </h4>

            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#FFE1E1',
                  color: '#991B1B',
                  border: '1px solid #FCA5A5',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                  Review Status Decision:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600
                  }}
                >
                  <option value="VALIDATED">VALIDATED (True Positive - Flag for Action)</option>
                  <option value="REJECTED">REJECTED (False Positive - Dismiss Signal)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (In Progress)</option>
                  <option value="INVESTIGATE">INVESTIGATE (Escalate to Field Audit)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                  Reviewer Identity:
                </label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                  Review Rationale & Notes (Required):
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter administrative justification, findings, or disposition notes..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving Review...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>

          {/* Past Review Audit History */}
          {anomaly.review_history && anomaly.review_history.length > 0 && (
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.75rem 0' }}>
                Review History Audit Trail
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {anomaly.review_history.map((rh) => (
                  <div
                    key={rh.review_id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      borderLeft: '3px solid #2563EB'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '0.2rem' }}>
                      <span>
                        <strong>{rh.reviewer}</strong> changed status to <strong>{rh.new_status}</strong>
                      </span>
                      <span>{rh.timestamp}</span>
                    </div>
                    <div style={{ color: '#334155', fontStyle: 'italic' }}>"{rh.note}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
