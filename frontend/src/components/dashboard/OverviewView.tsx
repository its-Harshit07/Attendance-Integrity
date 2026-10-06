import React from 'react';
import type { DashboardSummary, Anomaly } from '../../types/dashboard';

interface OverviewProps {
  summary: DashboardSummary | null;
  recentAnomalies: Anomaly[];
  onSelectAnomaly: (id: string) => void;
  onNavigateToQueue: (filter?: { risk?: string; status?: string }) => void;
  loading: boolean;
}

export const OverviewView: React.FC<OverviewProps> = ({
  summary,
  recentAnomalies,
  onSelectAnomaly,
  onNavigateToQueue,
  loading
}) => {
  if (loading || !summary) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  // Calculate high priority total
  const highPriorityTotal = summary.critical_risk_count + summary.high_risk_count;
  const resolvedTotal = summary.validated_count + summary.rejected_count;
  const actionableReviewSignals = summary.critical_risk_count + summary.high_risk_count + summary.medium_risk_count;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          Dashboard Overview
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Real-time summary of attendance anomalies, review signal queue, and compliance metrics.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* Card 1: Review Signals */}
        <div
          onClick={() => onNavigateToQueue({ status: 'UNREVIEWED' })}
          className="metric-card"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            Actionable Review Signals
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1E293B' }}>{actionableReviewSignals}</span>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 500 }}>
              (out of {summary.total_anomalies} total signals)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
            Unique student-date observations evaluated as Critical, High, or Medium risk.
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div
          onClick={() => onNavigateToQueue({ status: 'UNREVIEWED' })}
          className="metric-card"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            Pending Review
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#D97706', marginBottom: '0.5rem' }}>
            {summary.unreviewed_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Awaiting administrator evaluation in decision workflow.
          </div>
        </div>

        {/* Card 3: High Priority Risk */}
        <div
          onClick={() => onNavigateToQueue({ risk: 'CRITICAL' })}
          className="metric-card"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            High Priority Risk
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#DC2626' }}>{highPriorityTotal}</span>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#FFE1E1',
                color: '#991B1B',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px'
              }}
            >
              {summary.critical_risk_count} Critical • {summary.high_risk_count} High
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            Severe rule violations and high anomaly confidence score (&ge; 0.90).
          </div>
        </div>

        {/* Card 4: Resolved Reviews */}
        <div
          onClick={() => onNavigateToQueue({ status: 'VALIDATED' })}
          className="metric-card"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.25rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            Resolved Reviews
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669', marginBottom: '0.5rem' }}>
            {resolvedTotal}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
            {summary.validated_count} Validated (True Positive) • {summary.rejected_count} Dismissed (False Positive)
          </div>
        </div>
      </div>

      {/* Middle Section: Risk Tier Breakdown & Detection Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Risk Tier Distribution */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '1rem' }}>
            Risk Tier Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: '#991B1B' }}>Critical Risk</span>
                <span style={{ fontWeight: 600, color: '#475569' }}>{summary.critical_risk_count}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(summary.critical_risk_count / summary.total_anomalies) * 100}%`,
                    backgroundColor: '#DC2626'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: '#C2410C' }}>High Risk</span>
                <span style={{ fontWeight: 600, color: '#475569' }}>{summary.high_risk_count}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(summary.high_risk_count / summary.total_anomalies) * 100}%`,
                    backgroundColor: '#EA580C'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: '#B45309' }}>Medium Risk</span>
                <span style={{ fontWeight: 600, color: '#475569' }}>{summary.medium_risk_count}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(summary.medium_risk_count / summary.total_anomalies) * 100}%`,
                    backgroundColor: '#D97706'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Low Risk (Statistical Variance)</span>
                <span style={{ fontWeight: 600, color: '#475569' }}>{summary.low_risk_count}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(summary.low_risk_count / summary.total_anomalies) * 100}%`,
                    backgroundColor: '#94A3B8'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detection Method & Category Breakdown */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', marginBottom: '1rem' }}>
            Detection Source Breakdown
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Rules Only</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563EB', marginTop: '0.25rem' }}>
                {summary.rules_detected}
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>ML Only</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7C3AED', marginTop: '0.25rem' }}>
                {summary.ml_detected}
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Combined</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>
                {summary.combined_detected}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>
            Category Classification
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ flex: 1, backgroundColor: '#EFF6FF', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontWeight: 600, color: '#1E40AF' }}>Data Integrity Anomalies</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1D4ED8', marginTop: '0.25rem' }}>
                {summary.data_integrity_count}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Duplicate, conflict, invalid record</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#F5F3FF', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontWeight: 600, color: '#5B21B6' }}>Behavioral Anomalies</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6D28D9', marginTop: '0.25rem' }}>
                {summary.behavioral_count}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8B5CF6' }}>Spikes, streaks, deviations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent High-Priority Review Signals Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>
              Recent Actionable Review Signals
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
              Showing top unreviewed critical and high risk signals requiring attention.
            </p>
          </div>
          <button
            onClick={() => onNavigateToQueue({ status: 'UNREVIEWED' })}
            style={{
              padding: '0.4rem 0.85rem',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            View All in Queue &rarr;
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Anomaly ID</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Student Name</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Class</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Risk Tier</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Source</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                    No pending high priority signals.
                  </td>
                </tr>
              ) : (
                recentAnomalies.slice(0, 5).map((a) => (
                  <tr key={a.anomaly_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B', fontFamily: 'monospace' }}>
                      {a.anomaly_id}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>{a.student_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748B' }}>{a.class_id}</td>
                    <td style={{ padding: '0.75rem', color: '#475569' }}>{a.date}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        {a.anomaly_category}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          backgroundColor:
                            a.risk_tier === 'CRITICAL'
                              ? '#FFE1E1'
                              : a.risk_tier === 'HIGH'
                              ? '#FFF1CC'
                              : a.risk_tier === 'MEDIUM'
                              ? '#DCEBFF'
                              : '#F1F5F9',
                          color:
                            a.risk_tier === 'CRITICAL'
                              ? '#991B1B'
                              : a.risk_tier === 'HIGH'
                              ? '#9A3412'
                              : a.risk_tier === 'MEDIUM'
                              ? '#1E40AF'
                              : '#475569',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {a.risk_tier}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#64748B' }}>{a.detection_source}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => onSelectAnomaly(a.anomaly_id)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Review Signal
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
