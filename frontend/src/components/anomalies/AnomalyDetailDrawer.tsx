import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { AnomalyDetail, ReviewStatus } from '../../types/dashboard';
import { updateReviewStatus } from '../../api/client';
import { formatEnumLabel, getRiskBadgeClass, getStatusBadgeClass } from '../../utils/formatters';
import { Skeleton } from '../common/Skeleton';

interface DetailDrawerProps {
  anomaly: AnomalyDetail | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: 'UNREVIEWED', label: 'Unreviewed' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'INVESTIGATE', label: 'Investigate' }
];

export const AnomalyDetailDrawer: React.FC<DetailDrawerProps> = ({
  anomaly,
  loading = false,
  error = null,
  onClose,
  onReviewSubmitted
}) => {
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>('VALIDATED');
  const [reviewer, setReviewer] = useState<string>('Administrator');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (anomaly && anomaly.anomaly_id !== trackedId) {
    setTrackedId(anomaly.anomaly_id);
    setNewStatus(anomaly.review_status === 'UNREVIEWED' ? 'VALIDATED' : anomaly.review_status);
    setNote('');
    setErrorMsg(null);
  }

  const isOpen = Boolean(anomaly || loading || error);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anomaly) return;
    if (!note.trim()) {
      setErrorMsg('Please enter a review note before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await updateReviewStatus(
        anomaly.anomaly_id,
        newStatus,
        note.trim(),
        reviewer.trim() || 'Administrator'
      );
      setSubmitting(false);
      onReviewSubmitted();
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err.message || 'Failed to submit review');
    }
  };

  const conciseExplanation = anomaly
    ? anomaly.evidence && anomaly.evidence.length > 0
      ? anomaly.evidence[0].explanation
      : `Flagged by ${anomaly.detection_source} (score ${anomaly.anomaly_score.toFixed(3)}) for ${formatEnumLabel(
          anomaly.anomaly_category
        ).toLowerCase()}.`
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="drawer-backdrop"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Anomaly details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="drawer-header">
              <div>
                <div className="detail-k">Anomaly Record</div>
                <div className="mono" style={{ fontSize: '0.96rem', fontWeight: 600, marginTop: '0.15rem' }}>
                  {anomaly ? anomaly.anomaly_id : 'Loading…'}
                </div>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={onClose}
                aria-label="Close detail panel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Skeleton width="60%" height="1.25rem" />
                  <div className="detail-grid">
                    <Skeleton height="3.6rem" />
                    <Skeleton height="3.6rem" />
                    <Skeleton height="3.6rem" />
                    <Skeleton height="3.6rem" />
                  </div>
                  <Skeleton height="4.5rem" />
                  <Skeleton height="7.5rem" />
                </div>
              ) : error || !anomaly ? (
                <div className="inline-error" role="alert">
                  <span>{error || 'Unable to load anomaly details.'}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>{anomaly.student_name}</div>
                      <div className="cell-sub mono" style={{ marginTop: '0.2rem' }}>
                        {anomaly.student_id} &middot; {anomaly.class_id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                      <span className={getRiskBadgeClass(anomaly.risk_tier)}>{anomaly.risk_tier}</span>
                      <span className={getStatusBadgeClass(anomaly.review_status)}>
                        {formatEnumLabel(anomaly.review_status)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-kv">
                      <div className="detail-k">Category</div>
                      <div className="detail-v">{formatEnumLabel(anomaly.anomaly_category)}</div>
                    </div>
                    <div className="detail-kv">
                      <div className="detail-k">Attendance Date</div>
                      <div className="detail-v mono">
                        {anomaly.date} ({anomaly.attendance_status})
                      </div>
                    </div>
                    <div className="detail-kv">
                      <div className="detail-k">Detection Source</div>
                      <div className="detail-v">{anomaly.detection_source}</div>
                    </div>
                    <div className="detail-kv">
                      <div className="detail-k">Signal Score</div>
                      <div className="detail-v mono">{anomaly.anomaly_score.toFixed(4)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="detail-k" style={{ marginBottom: '0.4rem' }}>
                      Explanation
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gw-muted)', lineHeight: 1.55 }}>
                      {conciseExplanation}
                    </p>
                  </div>

                  <div>
                    <div className="detail-k" style={{ marginBottom: '0.5rem' }}>
                      Supporting Evidence
                    </div>
                    {anomaly.evidence && anomaly.evidence.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {anomaly.evidence.map((ev) => (
                          <div key={ev.evidence_id} className="evidence-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                {ev.rule_id} &middot; {ev.rule_name}
                              </span>
                              <span className={getRiskBadgeClass(ev.severity)}>{ev.severity}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gw-muted)' }}>
                              {ev.explanation}
                            </div>
                            <div className="evidence-meta mono">
                              <span>Observed: {ev.observed_value}</span>
                              <span>Expected: {ev.expected_value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="evidence-item" style={{ color: 'var(--gw-muted)', fontSize: '0.8rem' }}>
                        Statistical deviation detected ({anomaly.detection_source}, score{' '}
                        <span className="mono">{anomaly.anomaly_score.toFixed(4)}</span>).
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.1rem' }}>
                    <div className="detail-k" style={{ marginBottom: '0.75rem' }}>
                      Review Action
                    </div>

                    {errorMsg && (
                      <div className="inline-error" style={{ marginBottom: '0.85rem' }} role="alert">
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div>
                        <label
                          htmlFor="review-status-select"
                          style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gw-muted)', marginBottom: '0.35rem' }}
                        >
                          Status
                        </label>
                        <select
                          id="review-status-select"
                          className="gw-select"
                          style={{ width: '100%' }}
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          {REVIEW_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} ({opt.value})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="review-reviewer-input"
                          style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gw-muted)', marginBottom: '0.35rem' }}
                        >
                          Reviewer
                        </label>
                        <input
                          id="review-reviewer-input"
                          type="text"
                          className="gw-input"
                          style={{ width: '100%' }}
                          value={reviewer}
                          onChange={(e) => setReviewer(e.target.value)}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-note-input"
                          style={{ display: 'block', fontSize: '0.75rem', color: 'var(--gw-muted)', marginBottom: '0.35rem' }}
                        >
                          Review Note
                        </label>
                        <textarea
                          id="review-note-input"
                          rows={3}
                          className="gw-textarea"
                          style={{ width: '100%', resize: 'vertical' }}
                          placeholder="Record verification findings or decision rationale…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.2rem' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                          {submitting ? 'Saving…' : 'Submit Decision'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {anomaly.review_history && anomaly.review_history.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.1rem' }}>
                      <div className="detail-k" style={{ marginBottom: '0.6rem' }}>
                        Review History
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {anomaly.review_history.map((rh) => (
                          <div key={rh.review_id} className="history-item">
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                color: 'var(--gw-muted)',
                                fontSize: '0.74rem',
                                marginBottom: '0.2rem'
                              }}
                            >
                              <span>
                                <strong style={{ color: 'var(--gw-ink)' }}>{rh.reviewer}</strong> &rarr;{' '}
                                {formatEnumLabel(rh.new_status)}
                              </span>
                              <span className="mono">{rh.timestamp}</span>
                            </div>
                            <div style={{ color: 'var(--gw-ink)', fontSize: '0.8rem' }}>{rh.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
