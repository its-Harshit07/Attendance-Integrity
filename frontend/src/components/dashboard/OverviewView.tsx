import React, { useEffect, useState } from 'react';
import type { DashboardSummary, Anomaly } from '../../types/dashboard';
import { OverviewSkeleton } from '../common/Skeleton';
import { formatEnumLabel, getRiskBadgeClass, getStatusBadgeClass } from '../../utils/formatters';

interface OverviewProps {
  summary: DashboardSummary | null;
  recentAnomalies: Anomaly[];
  onSelectAnomaly: (id: string) => void;
  onNavigateToQueue: (filter?: { risk?: string; status?: string }) => void;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const SLOW_NOTICE_DELAY = 8000;

export const OverviewView: React.FC<OverviewProps> = ({
  summary,
  recentAnomalies,
  onSelectAnomaly,
  onNavigateToQueue,
  loading,
  error,
  onRetry
}) => {
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = setTimeout(() => setShowSlowNotice(true), SLOW_NOTICE_DELAY);
    return () => {
      clearTimeout(timer);
      setShowSlowNotice(false);
    };
  }, [loading]);

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading dashboard overview">
        {showSlowNotice && (
          <div style={{ marginBottom: '1rem' }}>
            <span className="skeleton-connecting-notice">
              <span className="skeleton-connecting-dot" />
              Connecting to service…
            </span>
          </div>
        )}
        <OverviewSkeleton />
      </section>
    );
  }

  if (error || !summary) {
    return (
      <div className="section-stack">
        <div className="page-header">
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-subtitle">Monitor attendance integrity and review flagged records.</p>
          </div>
        </div>
        <div className="inline-error" role="alert">
          <span>
            <strong>Unable to load metrics.</strong> {error || 'Backend connection failed.'}
          </span>
          {onRetry && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="section-stack">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Monitor attendance integrity and review flagged records.</p>
        </div>
        <button
          type="button"
          className="btn btn-cyan btn-sm"
          onClick={() => onNavigateToQueue({ status: 'UNREVIEWED' })}
        >
          Open Anomaly Queue
        </button>
      </div>

      {/* Four Compact Metric Cards */}
      <div className="metrics-grid">
        <button
          type="button"
          className="metric-card"
          onClick={() => onNavigateToQueue({})}
        >
          <span className="metric-label">Total Signals</span>
          <span className="metric-value">{summary.total_anomalies}</span>
          <span className="metric-foot">{summary.unreviewed_count} unreviewed</span>
        </button>

        <button
          type="button"
          className="metric-card"
          onClick={() => onNavigateToQueue({ risk: 'CRITICAL' })}
        >
          <span className="metric-label">Critical</span>
          <span className="metric-value critical">{summary.critical_risk_count}</span>
          <span className="metric-foot">Immediate review</span>
        </button>

        <button
          type="button"
          className="metric-card"
          onClick={() => onNavigateToQueue({ risk: 'HIGH' })}
        >
          <span className="metric-label">High Risk</span>
          <span className="metric-value high">{summary.high_risk_count}</span>
          <span className="metric-foot">Priority queue</span>
        </button>

        <button
          type="button"
          className="metric-card"
          onClick={() => onNavigateToQueue({ risk: 'MEDIUM' })}
        >
          <span className="metric-label">Medium Risk</span>
          <span className="metric-value medium">{summary.medium_risk_count}</span>
          <span className="metric-foot">{summary.low_risk_count} low risk</span>
        </button>
      </div>

      {/* Priority Anomaly Queue Preview */}
      <div className="table-panel">
        <div className="table-panel-header">
          <div>
            <h2 className="table-panel-title">Priority Anomalies</h2>
            <p className="table-panel-meta">Unreviewed records awaiting decision</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigateToQueue({})}
          >
            View All &rarr;
          </button>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No unreviewed records in the priority queue.
                  </td>
                </tr>
              ) : (
                recentAnomalies.slice(0, 6).map((a) => (
                  <tr
                    key={a.anomaly_id}
                    className="clickable"
                    onClick={() => onSelectAnomaly(a.anomaly_id)}
                  >
                    <td>
                      <div className="cell-primary">{a.student_name}</div>
                      <div className="cell-sub mono">
                        {a.student_id} &middot; {a.class_id}
                      </div>
                    </td>
                    <td>
                      <span className="tag-muted">{formatEnumLabel(a.anomaly_category)}</span>
                    </td>
                    <td>
                      <span className={getRiskBadgeClass(a.risk_tier)}>{a.risk_tier}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.detection_source}</td>
                    <td>
                      <span className={getStatusBadgeClass(a.review_status)}>
                        {formatEnumLabel(a.review_status)}
                      </span>
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {a.date}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnomaly(a.anomaly_id);
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
