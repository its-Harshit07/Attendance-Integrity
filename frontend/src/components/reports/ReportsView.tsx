import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Printer } from 'lucide-react';
import type { CompliancePreview } from '../../types/dashboard';
import { fetchCompliancePreview } from '../../api/client';
import { Skeleton } from '../common/Skeleton';

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<CompliancePreview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState<number>(0);

  useEffect(() => {
    let active = true;
    fetchCompliancePreview()
      .then((data) => {
        if (!active) return;
        setReport(data);
        setErrorMsg(null);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMsg(err.message || 'Failed to load compliance preview');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryTick]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg(null);
    setRetryTick((t) => t + 1);
  };

  const handleExportSummaryCsv = () => {
    if (!report) return;
    const s = report.summary;
    const rows = [
      ['metric', 'value'],
      ['total_signals', s.total_anomalies],
      ['critical_risk', s.critical_risk_count],
      ['high_risk', s.high_risk_count],
      ['medium_risk', s.medium_risk_count],
      ['low_risk', s.low_risk_count],
      ['unreviewed', s.unreviewed_count],
      ['under_review', s.under_review_count],
      ['validated', s.validated_count],
      ['rejected', s.rejected_count],
      ['investigate', s.investigate_count],
      ['rules_detected', s.rules_detected],
      ['ml_detected', s.ml_detected],
      ['combined_detected', s.combined_detected]
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance-integrity-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="gw-view" aria-busy="true" aria-label="Loading reports">
        <div>
          <Skeleton width="140px" height="2rem" />
          <Skeleton width="280px" height="0.9rem" style={{ marginTop: '0.5rem' }} />
        </div>
        <div className="gw-overview-grid">
          <Skeleton height="12rem" borderRadius="18px" />
          <Skeleton height="12rem" borderRadius="18px" />
        </div>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="gw-view">
        <div className="gw-view-header">
          <div>
            <h1 className="gw-title">Reports</h1>
            <p className="gw-subtitle">Compliance preview and detection summary.</p>
          </div>
        </div>
        <div className="inline-error" role="alert">
          <span>
            <strong>Failed to load report.</strong> {errorMsg || 'Unavailable'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = report.summary;

  return (
    <motion.div
      className="gw-view"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="gw-view-header">
        <div>
          <h1 className="gw-title">Reports</h1>
          <p className="gw-subtitle">Compliance preview and detection summary.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleExportSummaryCsv}>
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div className="gw-overview-grid">
        {/* Severity & Signal Summary */}
        <section className="gw-panel">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Severity Distribution</span>
            <span className="gw-panel-meta mono">{s.total_anomalies} signals</span>
          </div>
          <div className="gw-table-scroll">
            <table className="gw-table">
              <tbody>
                <tr>
                  <td>Critical</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.critical_risk_count}
                  </td>
                </tr>
                <tr>
                  <td>High Risk</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.high_risk_count}
                  </td>
                </tr>
                <tr>
                  <td>Medium Risk</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.medium_risk_count}
                  </td>
                </tr>
                <tr>
                  <td>Low Risk</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.low_risk_count}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Review Status & Detection Source Summary */}
        <section className="gw-panel">
          <div className="gw-panel-head">
            <span className="gw-panel-title">Review &amp; Detection Summary</span>
            <span className="gw-panel-meta">Live database</span>
          </div>
          <div className="gw-table-scroll">
            <table className="gw-table">
              <tbody>
                <tr>
                  <td>Unreviewed / Under Review</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.unreviewed_count} / {s.under_review_count}
                  </td>
                </tr>
                <tr>
                  <td>Validated / Rejected / Investigate</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.validated_count} / {s.rejected_count} / {s.investigate_count}
                  </td>
                </tr>
                <tr>
                  <td>Rules / ML / Combined</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.rules_detected} / {s.ml_detected} / {s.combined_detected}
                  </td>
                </tr>
                <tr>
                  <td>Data Integrity / Behavioral</td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {s.data_integrity_count} / {s.behavioral_count}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Compliance Notice */}
      <section className="gw-panel">
        <div className="gw-panel-head">
          <span className="gw-panel-title">{report.report_title}</span>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--gw-muted)', lineHeight: 1.55 }}>
          {report.notice}
        </p>
      </section>
    </motion.div>
  );
};

