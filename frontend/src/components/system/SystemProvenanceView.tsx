import React, { useState, useEffect, useCallback } from 'react';
import type { SystemInfo, HealthStatus } from '../../types/dashboard';
import { fetchSystemInfo, fetchHealth } from '../../api/client';
import { SystemProvenanceSkeleton } from '../common/Skeleton';

export const SystemProvenanceView: React.FC = () => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    Promise.all([
      fetchSystemInfo(),
      fetchHealth().catch(() => null)
    ])
      .then(([infoData, healthData]) => {
        setInfo(infoData);
        setHealth(healthData);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading system provenance">
        <SystemProvenanceSkeleton />
      </section>
    );
  }

  if (errorMsg || !info) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
            System Architecture &amp; Operational Provenance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
            Operational status, active detection engines, feature definitions, and decision-support governance.
          </p>
        </div>
        <div className="skeleton-inline-error" role="alert">
          <span className="skeleton-inline-error-msg">
            <strong>Failed to load system info.</strong> {errorMsg}
          </span>
          <button className="skeleton-retry-btn" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isServiceOk = health?.status === 'ok' || !health;
  const isDbConnected = health?.database === 'connected' || !health;
  const isModelActive = health?.model === 'loaded' || !health;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          System Architecture &amp; Operational Provenance
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Operational status, active detection engines, feature definitions, and decision-support governance.
        </p>
      </div>

      {/* Operational Status & Connectivity Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isServiceOk ? '#10B981' : '#F59E0B'
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Service Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              {isServiceOk ? 'Operational' : 'Degraded'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isDbConnected ? '#10B981' : '#EF4444'
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Operational Database</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              {isDbConnected ? 'Connected' : 'Unavailable'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isModelActive ? '#10B981' : '#EF4444'
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Detection Pipeline</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              Hybrid (Rules + ML)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6'
            }}
          />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Governance Protocol</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              Human-in-the-Loop
            </div>
          </div>
        </div>
      </div>

      {/* Decision-Support & Governance Safeguards Notice */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderLeft: '4px solid #3B82F6',
          borderRadius: '8px',
          padding: '1rem 1.25rem'
        }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.25rem' }}>
          Decision-Support &amp; Governance Safeguards
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
          Automated anomaly detections serve as advisory risk signals to assist administrative oversight.
          The system never issues automated penalties, attendance adjustments, or compliance filings.
          All flagged records require contextual review, evidence verification, and manual validation by authorized administrators.
        </p>
      </div>

      {/* Detection Methodology & Evidence Production */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Deterministic Rules
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            Production Rules (R001–R008)
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', lineHeight: 1.45, margin: '0.5rem 0 0 0' }}>
            Validates records against 8 deterministic attendance integrity rules, identifying conflicting statuses, duplicate entries, invalid status codes, and behavioral spikes.
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Unsupervised Machine Learning
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            Isolation Forest Model
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', lineHeight: 1.45, margin: '0.5rem 0 0 0' }}>
            Evaluates multivariate temporal feature distributions to detect subtle attendance anomalies relative to individual baseline trends and peer group cohorts.
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Auditable Evidence
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            Evidence Synthesis &amp; Risk Tiers
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem', lineHeight: 1.45, margin: '0.5rem 0 0 0' }}>
            Synthesizes rule activations and model scores into transparent evidence explanations with clear observed vs. expected values and actionable risk tiers (Critical, High, Medium, Low).
          </p>
        </div>
      </div>

      {/* Temporal Feature List & Production Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* 13 Temporal Features */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem 0' }}>
            Feature Engineering Pipeline ({info.feature_count} Input Features)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
            {info.feature_list.map((feat, idx) => (
              <div
                key={feat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  color: '#334155'
                }}
              >
                <span style={{ color: '#94A3B8', fontWeight: 600 }}>{idx + 1}.</span>
                <span style={{ fontWeight: 600 }}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Production Rules */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem 0' }}>
            Production Deterministic Rules (R001 - R008)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {info.production_rules.map((rule) => (
              <div
                key={rule}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.8rem',
                  color: '#1E40AF',
                  fontWeight: 600
                }}
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Governance & Administrative Metadata (Collapsible) */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
        <button
          onClick={() => setShowTechDetails((prev) => !prev)}
          style={{
            width: '100%',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFAFA',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
          aria-expanded={showTechDetails}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
            Technical Governance &amp; Administrative Metadata
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            {showTechDetails ? 'Hide Specifications ▲' : 'Show Specifications ▼'}
          </span>
        </button>

        {showTechDetails && (
          <div style={{ padding: '1.25rem', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Internal Model Specification</div>
                <div style={{ fontSize: '0.875rem', color: '#1E293B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  Isolation Forest ({info.model_version})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Operating Decision Threshold</div>
                <div style={{ fontSize: '0.875rem', color: '#1E293B', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {info.operating_threshold_raw} (Score &ge; 0.70)
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Feature Input Dimension</div>
                <div style={{ fontSize: '0.875rem', color: '#1E293B', marginTop: '0.2rem' }}>
                  {info.feature_count} temporal metrics
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Calibration Baseline Window</div>
                <div style={{ fontSize: '0.875rem', color: '#1E293B', marginTop: '0.2rem' }}>
                  {info.training_date_range}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '1rem', marginBottom: 0 }}>
              Complete evaluation methodology, benchmark confusion matrices, and regression suite artifacts are maintained in technical documentation (<code>docs/</code> and <code>reports/</code>).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
