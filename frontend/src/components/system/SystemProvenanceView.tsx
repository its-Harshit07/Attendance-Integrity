import React, { useState, useEffect } from 'react';
import type { SystemInfo } from '../../types/dashboard';
import { fetchSystemInfo } from '../../api/client';

export const SystemProvenanceView: React.FC = () => {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemInfo()
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>Loading system provenance parameters...</div>;
  }

  if (errorMsg || !info) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#FFE1E1', color: '#991B1B', borderRadius: '8px' }}>
        {errorMsg || 'Failed to load system info'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          System Provenance & Model Lineage
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Frozen Phase 4 architecture parameters, validation split boundaries, feature definitions, and test state.
        </p>
      </div>

      {/* Frozen Verification Banner */}
      <div
        style={{
          backgroundColor: '#DDF7E8',
          border: '1px solid #A7F3D0',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#059669'
            }}
          />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46' }}>
              Phase 4 Frozen Pipeline Verified
            </div>
            <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '0.15rem' }}>
              Regression Suite: {info.phase4_tests_passed} • Experimental State: {info.experimental_integrity}
            </div>
          </div>
        </div>
        <span
          style={{
            backgroundColor: '#FFFFFF',
            color: '#047857',
            border: '1px solid #A7F3D0',
            fontWeight: 700,
            fontSize: '0.8rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px'
          }}
        >
          Model Version {info.model_version}
        </span>
      </div>

      {/* Core Parameters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Training Window</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            {info.training_date_range}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Baseline model learning period</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Validation Window</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            {info.validation_date_range}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Threshold selection window</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Test Holdout Window</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', marginTop: '0.25rem' }}>
            {info.test_date_range}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Final controlled evaluation period</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Operating ML Threshold</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2563EB', marginTop: '0.25rem' }}>
            {info.operating_threshold_raw} (Score &ge; 0.70)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>Random Seed: {info.random_seed}</div>
        </div>
      </div>

      {/* Temporal Feature List & Production Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* 13 Temporal Features */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1E293B', margin: '0 0 1rem 0' }}>
            Pipeline Features ({info.feature_count} Input Features)
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
    </div>
  );
};
