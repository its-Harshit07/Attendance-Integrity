import React, { useState, useEffect } from 'react';
import type { AuditLogEntry } from '../../types/dashboard';
import { fetchAuditLog } from '../../api/client';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAuditLog();
      setLogs(data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to load audit logs');
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter(
    (log) =>
      log.anomaly_id.toLowerCase().includes(search.toLowerCase()) ||
      log.reviewer.toLowerCase().includes(search.toLowerCase()) ||
      log.note.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          Immutable System Audit Log
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Chronological append-only record of all human review decisions, status transitions, and administrative rationales.
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          placeholder="Filter audit log by Anomaly ID, Reviewer, or Rationale text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '400px',
            padding: '0.6rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
        <button
          onClick={loadAuditLogs}
          style={{
            padding: '0.6rem 1rem',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Refresh Log
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: '#FFE1E1',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Audit Log Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Audit ID</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Anomaly ID</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Reviewer</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Transition</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Reviewer Note / Rationale</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    No audit log entries recorded yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.audit_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#64748B', fontFamily: 'monospace' }}>
                      #{log.audit_id}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1E293B', fontFamily: 'monospace' }}>
                      {log.anomaly_id}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#2563EB' }}>{log.reviewer}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {log.previous_status} &rarr; {log.new_status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#334155' }}>{log.note}</td>
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
