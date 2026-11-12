import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RotateCw, Search } from 'lucide-react';
import type { AuditLogEntry } from '../../types/dashboard';
import { fetchAuditLog } from '../../api/client';
import { AuditLogTableSkeleton } from '../common/Skeleton';
import { formatEnumLabel, getStatusBadgeClass } from '../../utils/formatters';

interface AuditLogViewProps {
  onSelectAnomaly?: (anomalyId: string) => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onSelectAnomaly }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    let active = true;
    fetchAuditLog()
      .then((data) => {
        if (!active) return;
        setLogs(data);
        setErrorMsg(null);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMsg(err.message || 'Failed to load audit log');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const handleRefresh = () => {
    setLoading(true);
    setErrorMsg(null);
    setRefreshTick((t) => t + 1);
  };

  const query = search.trim().toLowerCase();
  const filteredLogs = query
    ? logs.filter(
        (log) =>
          log.anomaly_id.toLowerCase().includes(query) ||
          log.reviewer.toLowerCase().includes(query) ||
          log.note.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.new_status.toLowerCase().includes(query)
      )
    : logs;

  return (
    <motion.div
      className="gw-view"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="gw-view-header">
        <div>
          <h1 className="gw-title">Audit Log</h1>
          <p className="gw-subtitle">Chronological record of review decisions and outcomes.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleRefresh}>
          <RotateCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="gw-panel" style={{ padding: '0.85rem 1.1rem' }}>
        <div className="gw-toolbar">
          <div className="gw-search-wrap" style={{ flex: '1 1 240px' }}>
            <Search size={14} className="gw-search-icon" />
            <input
              type="text"
              className="gw-input gw-input-icon"
              placeholder="Search by Anomaly ID, reviewer, outcome, or note…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit log"
            />
          </div>
          <span className="gw-panel-meta mono">{filteredLogs.length} entries</span>
        </div>
      </div>

      {errorMsg && (
        <div className="inline-error" role="alert">
          <span>
            <strong>Failed to load audit log.</strong> {errorMsg}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      <div className="gw-panel" style={{ padding: '0.75rem 1.25rem' }}>
        <div className="gw-table-scroll">
          <table className="gw-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Record</th>
                <th>Review Outcome</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AuditLogTableSkeleton />
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gw-muted)' }}>
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.audit_id}
                    className={onSelectAnomaly ? 'clickable' : undefined}
                    onClick={onSelectAnomaly ? () => onSelectAnomaly(log.anomaly_id) : undefined}
                  >
                    <td className="mono" style={{ color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>
                      {log.timestamp}
                    </td>
                    <td>
                      <div className="cell-primary">{formatEnumLabel(log.action)}</div>
                      <div className="cell-sub mono">
                        {log.previous_status} &rarr; {log.new_status}
                      </div>
                    </td>
                    <td className="mono" style={{ fontWeight: 500 }}>
                      {log.anomaly_id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={getStatusBadgeClass(log.new_status)}>
                          {formatEnumLabel(log.new_status)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gw-muted)' }}>
                          by {log.reviewer}
                        </span>
                      </div>
                      {log.note && (
                        <div className="cell-sub" style={{ marginTop: '0.22rem' }}>
                          {log.note}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
