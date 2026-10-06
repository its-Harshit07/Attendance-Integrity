import React from 'react';
import type { DashboardSummary } from '../../types/dashboard';

interface CompliancePreviewProps {
  summary: DashboardSummary | null;
}

export const CompliancePreviewView: React.FC<CompliancePreviewProps> = ({ summary }) => {
  if (!summary) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading compliance summary...</div>;
  }

  const totalReviewed = summary.validated_count + summary.rejected_count + summary.investigate_count;
  const reviewCompletionRate = ((totalReviewed / (summary.critical_risk_count + summary.high_risk_count + summary.medium_risk_count || 1)) * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          Compliance & Executive Summary Preview
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Preview generated human review workflow audit summary report for institutional compliance.
        </p>
      </div>

      {/* Summary KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Review Signal Population</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            {summary.critical_risk_count + summary.high_risk_count + summary.medium_risk_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
            Actionable CRITICAL, HIGH & MEDIUM signals
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Validated True Positives</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#047857', marginTop: '0.25rem' }}>
            {summary.validated_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
            Confirmed data integrity issues / anomalies
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Dismissed False Positives</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#64748B', marginTop: '0.25rem' }}>
            {summary.rejected_count}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
            Human reviewer rejected signals
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Review Workflow Progress</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563EB', marginTop: '0.25rem' }}>
            {reviewCompletionRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
            {totalReviewed} of {summary.critical_risk_count + summary.high_risk_count + summary.medium_risk_count} signals evaluated
          </div>
        </div>
      </div>

      {/* Institutional Compliance Report Preview Table */}
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
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>
            Institutional Compliance Audit Table
          </h3>
          <button
            onClick={() => window.print()}
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
            Export PDF / Print Report
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Metric Domain</th>
              <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Parameter Value</th>
              <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Compliance Standard</th>
              <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>Total Raw Detection Signals</td>
              <td style={{ padding: '0.75rem', color: '#475569' }}>{summary.total_anomalies} signals</td>
              <td style={{ padding: '0.75rem', color: '#64748B' }}>Combined Rules R001-R008 & ML Threshold 0.70</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ backgroundColor: '#DDF7E8', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  COMPLIANT
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>Actionable Review Signals (Crit/High/Med)</td>
              <td style={{ padding: '0.75rem', color: '#475569' }}>
                {summary.critical_risk_count + summary.high_risk_count + summary.medium_risk_count} signals
              </td>
              <td style={{ padding: '0.75rem', color: '#64748B' }}>Phase 4 Combined System Recall Evaluation Target</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ backgroundColor: '#DDF7E8', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  VERIFIED
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>Human Review Audit Trail Integrity</td>
              <td style={{ padding: '0.75rem', color: '#475569' }}>SQLite Append-Only Audit Log</td>
              <td style={{ padding: '0.75rem', color: '#64748B' }}>Mandatory reviewer ID & timestamps</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ backgroundColor: '#DDF7E8', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  ACTIVE
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
              <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B' }}>Phase 4 Model Weights State</td>
              <td style={{ padding: '0.75rem', color: '#475569' }}>Frozen IsolationForest (seed=42)</td>
              <td style={{ padding: '0.75rem', color: '#64748B' }}>Zero re-tuning in Phase 5</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{ backgroundColor: '#DDF7E8', color: '#047857', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  FROZEN
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
