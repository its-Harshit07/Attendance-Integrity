import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import type { Anomaly, DashboardSummary } from '../../types/dashboard';
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
  const [chartMode, setChartMode] = useState<'severity' | 'source' | 'category'>('severity');

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowSlowNotice(true), SLOW_NOTICE_DELAY);
    return () => {
      clearTimeout(timer);
      setShowSlowNotice(false);
    };
  }, [loading]);

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading overview">
        {showSlowNotice && (
          <div className="gw-panel-meta" style={{ marginBottom: '0.75rem' }}>
            Connecting to service…
          </div>
        )}
        <OverviewSkeleton />
      </section>
    );
  }

  if (error || !summary) {
    return (
      <div className="gw-view">
        <div className="gw-view-header">
          <div>
            <p className="gw-greeting">Welcome back.</p>
            <h1 className="gw-title">Overview</h1>
            <p className="gw-subtitle">Monitor attendance integrity and review flagged records.</p>
          </div>
        </div>
        <div className="inline-error" role="alert">
          <span>
            <strong>Unable to load metrics.</strong> {error || 'Backend connection failed.'}
          </span>
          {onRetry && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const highPriorityCount = summary.critical_risk_count + summary.high_risk_count;
  const totalSafe = Math.max(summary.total_anomalies, 1);

  const periodLabel =
    recentAnomalies.length > 0 && recentAnomalies[0].date
      ? `Latest signal: ${recentAnomalies[0].date}`
      : 'Active reporting period';

  const chartBars =
    chartMode === 'severity'
      ? [
          { label: 'Critical', value: summary.critical_risk_count, color: '#f87171' },
          { label: 'High', value: summary.high_risk_count, color: '#fb923c' },
          { label: 'Medium', value: summary.medium_risk_count, color: '#fbbf24' },
          { label: 'Low', value: summary.low_risk_count, color: 'rgba(244, 244, 237, 0.45)' }
        ]
      : chartMode === 'source'
      ? [
          { label: 'Rules', value: summary.rules_detected, color: '#9bb0ff' },
          { label: 'ML', value: summary.ml_detected, color: '#91d5b0' },
          { label: 'Combined', value: summary.combined_detected, color: '#fcd34d' }
        ]
      : [
          { label: 'Data Integrity', value: summary.data_integrity_count, color: '#9bb0ff' },
          { label: 'Behavioral', value: summary.behavioral_count, color: '#91d5b0' }
        ];

  const maxBar = Math.max(...chartBars.map((b) => b.value), 1);

  const reviewRows = [
    { label: 'Unreviewed', count: summary.unreviewed_count, color: '#fbbf24' },
    { label: 'Under Review', count: summary.under_review_count, color: '#93c5fd' },
    { label: 'Validated', count: summary.validated_count, color: '#91d5b0' },
    { label: 'Rejected', count: summary.rejected_count, color: 'rgba(244, 244, 237, 0.45)' },
    { label: 'Investigate', count: summary.investigate_count, color: '#f87171' }
  ];

  return (
    <motion.div
      className="gw-view"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="gw-view-header">
        <div>
          <p className="gw-greeting">Welcome back.</p>
          <h1 className="gw-title">Overview</h1>
          <p className="gw-subtitle">Monitor attendance integrity and review flagged records.</p>
        </div>
        <span className="gw-period-label mono">{periodLabel}</span>
      </div>

      {/* 2x2 Glass Card Grid */}
      <div className="gw-overview-grid">
        {/* Card 1: Attendance Signals */}
        <section className="gw-panel" aria-label="Attendance Signals">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Attendance Signals</span>
            <ShieldAlert size={16} style={{ color: 'var(--gw-muted)' }} />
          </div>

          <div>
            <div className="gw-big-metric">{summary.total_anomalies}</div>
            <div className="gw-metric-subrow" style={{ marginTop: '0.55rem' }}>
              <span className="gw-pill-badge">{highPriorityCount} critical &amp; high</span>
              <span className="gw-panel-meta">Records requiring attention</span>
            </div>
          </div>

          <div className="gw-account-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={16} style={{ color: 'var(--gw-muted)' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>Unreviewed Queue</div>
                <div className="gw-panel-meta mono">{summary.unreviewed_count} pending</div>
              </div>
            </div>
            <button
              type="button"
              className="gw-circle-action"
              onClick={() => onNavigateToQueue({ status: 'UNREVIEWED' })}
              aria-label="Open unreviewed anomalies"
              title="Open unreviewed anomalies"
            >
              <ArrowUpRight size={15} />
            </button>
          </div>
        </section>

        {/* Card 2: Risk Distribution */}
        <section className="gw-panel" aria-label="Risk Distribution">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Risk Distribution</span>
            <div className="gw-segment" role="tablist" aria-label="Distribution view">
              {(['severity', 'source', 'category'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={chartMode === mode}
                  className={`gw-segment-btn ${chartMode === mode ? 'active' : ''}`}
                  onClick={() => setChartMode(mode)}
                >
                  {mode === 'severity' ? 'Severity' : mode === 'source' ? 'Source' : 'Category'}
                </button>
              ))}
            </div>
          </div>

          <div className="gw-chart-stats">
            {chartBars.map((item) => (
              <div key={item.label}>
                <div className="gw-chart-stat-label">
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      display: 'inline-block'
                    }}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="gw-chart-stat-val">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Clean SVG Bar Visualization */}
          <svg
            viewBox="0 0 360 110"
            width="100%"
            height="110"
            role="img"
            aria-label={`Attendance ${chartMode} distribution chart`}
            style={{ overflow: 'visible', marginTop: 'auto' }}
          >
            {chartBars.map((item, index) => {
              const slotWidth = 360 / chartBars.length;
              const barWidth = Math.min(46, slotWidth * 0.48);
              const x = index * slotWidth + (slotWidth - barWidth) / 2;
              const barHeight = Math.max((item.value / maxBar) * 76, item.value > 0 ? 6 : 2);
              const y = 84 - barHeight;

              return (
                <g key={item.label}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={6}
                    fill={item.color}
                    fillOpacity={0.85}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={102}
                    textAnchor="middle"
                    fill="rgba(244, 244, 237, 0.65)"
                    fontSize="10"
                    fontFamily="Inter, sans-serif"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>

        {/* Card 3: Recent Anomalies */}
        <section className="gw-panel" aria-label="Recent Anomalies">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Recent Anomalies</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigateToQueue({})}
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {recentAnomalies.length === 0 ? (
            <div className="gw-panel-meta" style={{ padding: '1.5rem 0', textAlign: 'center' }}>
              No flagged records awaiting review.
            </div>
          ) : (
            <div className="gw-activity-list">
              {recentAnomalies.slice(0, 4).map((a) => (
                <button
                  key={a.anomaly_id}
                  type="button"
                  className="gw-activity-row"
                  onClick={() => onSelectAnomaly(a.anomaly_id)}
                >
                  <div className="gw-activity-left">
                    <div className="gw-activity-icon" aria-hidden="true">
                      {a.risk_tier === 'CRITICAL' || a.risk_tier === 'HIGH' ? (
                        <AlertCircle size={15} />
                      ) : (
                        <Activity size={15} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cell-primary" style={{ fontSize: '0.84rem' }}>
                        {a.student_id} &middot; {a.student_name}
                      </div>
                      <div className="cell-sub">
                        {formatEnumLabel(a.anomaly_category)} &middot; {a.date}
                      </div>
                    </div>
                  </div>

                  <div className="gw-activity-right">
                    <span className={getRiskBadgeClass(a.risk_tier)}>{a.risk_tier}</span>
                    <span className={getStatusBadgeClass(a.review_status)}>
                      {formatEnumLabel(a.review_status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Card 4: Review Status */}
        <section className="gw-panel" aria-label="Review Status">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Review Status</span>
            <span className="gw-panel-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={13} />
              <span>{summary.total_anomalies} total</span>
            </span>
          </div>

          <div className="gw-progress-list">
            {reviewRows.map((row) => {
              const pct = Math.round((row.count / totalSafe) * 100);
              return (
                <div key={row.label} className="gw-progress-item">
                  <div className="gw-progress-head">
                    <span style={{ color: 'var(--gw-ink)', fontWeight: 500 }}>{row.label}</span>
                    <span className="mono" style={{ color: 'var(--gw-muted)' }}>
                      {row.count}
                    </span>
                  </div>
                  <div className="gw-progress-track">
                    <div
                      className="gw-progress-fill"
                      style={{ width: `${pct}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
};
