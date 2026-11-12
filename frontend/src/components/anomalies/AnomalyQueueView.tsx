import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Anomaly } from '../../types/dashboard';
import type { AnomalyFilterParams } from '../../api/client';
import { AnomalyQueueTableSkeleton } from '../common/Skeleton';
import { formatEnumLabel, getRiskBadgeClass, getStatusBadgeClass } from '../../utils/formatters';

interface AnomalyQueueProps {
  anomalies: Anomaly[];
  totalCount: number;
  filterParams: AnomalyFilterParams;
  onFilterChange: (params: AnomalyFilterParams) => void;
  onSelectAnomaly: (anomalyId: string) => void;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const AnomalyQueueView: React.FC<AnomalyQueueProps> = ({
  anomalies,
  totalCount,
  filterParams,
  onFilterChange,
  onSelectAnomaly,
  loading,
  error,
  onRetry
}) => {
  const [searchInput, setSearchInput] = useState(filterParams.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filterParams, search: searchInput.trim() || undefined, offset: 0 });
  };

  const handleStatusFilter = (status: string) => {
    onFilterChange({ ...filterParams, status: status === 'ALL' ? undefined : status, offset: 0 });
  };

  const handleRiskFilter = (risk: string) => {
    onFilterChange({ ...filterParams, risk: risk === 'ALL' ? undefined : risk, offset: 0 });
  };

  const limit = filterParams.limit || 50;
  const currentOffset = filterParams.offset || 0;
  const currentPage = Math.floor(currentOffset / limit) + 1;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  const handlePageChange = (newPage: number) => {
    onFilterChange({ ...filterParams, offset: (newPage - 1) * limit });
  };

  const hasActiveFilters = Boolean(filterParams.search || filterParams.status || filterParams.risk);

  return (
    <motion.div
      className="section-stack"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">Anomaly Queue</h1>
          <p className="page-subtitle">Review flagged attendance records.</p>
        </div>
        <span className="table-panel-meta mono">
          {totalCount} {totalCount === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Search & Filters */}
      <div className="toolbar-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="input-dark input-with-icon"
              placeholder="Search student, ID, or class…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search anomalies"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ limit, offset: 0 });
              }}
            >
              Reset
            </button>
          )}
        </form>

        <div className="filter-group">
          <select
            className="select-dark"
            value={filterParams.risk || 'ALL'}
            onChange={(e) => handleRiskFilter(e.target.value)}
            aria-label="Filter by severity"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            className="select-dark"
            value={filterParams.status || 'ALL'}
            onChange={(e) => handleStatusFilter(e.target.value)}
            aria-label="Filter by review status"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNREVIEWED">Unreviewed</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VALIDATED">Validated</option>
            <option value="REJECTED">Rejected</option>
            <option value="INVESTIGATE">Investigate</option>
          </select>
        </div>
      </div>

      {/* Table Panel */}
      <div className="table-panel">
        <div className="table-panel-header">
          <span className="table-panel-meta">
            Showing {anomalies.length} of {totalCount}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="table-panel-meta mono" style={{ padding: '0 0.35rem' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AnomalyQueueTableSkeleton />
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ padding: '1.25rem' }}>
                    <div className="inline-error" role="alert">
                      <span>
                        <strong>Failed to load anomalies.</strong> {error}
                      </span>
                      {onRetry && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : anomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                anomalies.map((a) => (
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
    </motion.div>
  );
};
