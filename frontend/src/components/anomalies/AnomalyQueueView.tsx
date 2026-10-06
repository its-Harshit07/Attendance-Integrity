import React, { useState } from 'react';
import type { Anomaly } from '../../types/dashboard';
import type { AnomalyFilterParams } from '../../api/client';

interface AnomalyQueueProps {
  anomalies: Anomaly[];
  totalCount: number;
  filterParams: AnomalyFilterParams;
  onFilterChange: (params: AnomalyFilterParams) => void;
  onSelectAnomaly: (anomalyId: string) => void;
  loading: boolean;
}

export const AnomalyQueueView: React.FC<AnomalyQueueProps> = ({
  anomalies,
  totalCount,
  filterParams,
  onFilterChange,
  onSelectAnomaly,
  loading
}) => {
  const [searchInput, setSearchInput] = useState(filterParams.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filterParams, search: searchInput, offset: 0 });
  };

  const handleStatusFilter = (status: string) => {
    onFilterChange({ ...filterParams, status: status === 'ALL' ? undefined : status, offset: 0 });
  };

  const handleRiskFilter = (risk: string) => {
    onFilterChange({ ...filterParams, risk: risk === 'ALL' ? undefined : risk, offset: 0 });
  };

  const handleCategoryFilter = (category: string) => {
    onFilterChange({ ...filterParams, category: category === 'ALL' ? undefined : category, offset: 0 });
  };

  const handleSourceFilter = (source: string) => {
    onFilterChange({ ...filterParams, source: source === 'ALL' ? undefined : source, offset: 0 });
  };

  const limit = filterParams.limit || 50;
  const currentOffset = filterParams.offset || 0;
  const currentPage = Math.floor(currentOffset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const handlePageChange = (newPage: number) => {
    const newOffset = (newPage - 1) * limit;
    onFilterChange({ ...filterParams, offset: newOffset });
  };

  const getRiskBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return { bg: '#FFE1E1', color: '#991B1B', border: '#FCA5A5' };
      case 'HIGH':
        return { bg: '#FFF1CC', color: '#9A3412', border: '#FDBA74' };
      case 'MEDIUM':
        return { bg: '#DCEBFF', color: '#1E40AF', border: '#93C5FD' };
      case 'LOW':
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'UNREVIEWED':
        return { bg: '#FFF1CC', color: '#B45309' };
      case 'UNDER_REVIEW':
        return { bg: '#EAE4FF', color: '#6D28D9' };
      case 'VALIDATED':
        return { bg: '#DDF7E8', color: '#047857' };
      case 'REJECTED':
        return { bg: '#F1F5F9', color: '#64748B' };
      case 'INVESTIGATE':
        return { bg: '#FFE1E1', color: '#B91C1C' };
      default:
        return { bg: '#F1F5F9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
          Anomaly Review Queue
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Filter, triage, and review detected attendance integrity signals across all risk tiers.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search by Anomaly ID, Student Name, Student ID, or Class ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
          {filterParams.search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ ...filterParams, search: undefined, offset: 0 });
              }}
              style={{
                padding: '0.6rem 1rem',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Status:</span>
            <select
              value={filterParams.status || 'ALL'}
              onChange={(e) => handleStatusFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="UNREVIEWED">Unreviewed</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VALIDATED">Validated (True Positive)</option>
              <option value="REJECTED">Rejected (False Positive)</option>
              <option value="INVESTIGATE">Investigate Further</option>
            </select>
          </div>

          {/* Risk Tier Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Risk Tier:</span>
            <select
              value={filterParams.risk || 'ALL'}
              onChange={(e) => handleRiskFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Category:</span>
            <select
              value={filterParams.category || 'ALL'}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="DUPLICATE">Duplicate Record</option>
              <option value="CONFLICT">Status Conflict</option>
              <option value="BEHAVIORAL_SPIKE">Behavioral Spike</option>
              <option value="EXCEPTION_STREAK">Exception Streak</option>
              <option value="PERSONAL_DEVIATION">Personal Deviation</option>
              <option value="CLASS_DEVIATION">Class Deviation</option>
              <option value="MISSING_RECORD">Missing Record</option>
              <option value="INVALID_RECORD">Invalid Record</option>
            </select>
          </div>

          {/* Source Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Source:</span>
            <select
              value={filterParams.source || 'ALL'}
              onChange={(e) => handleSourceFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                backgroundColor: '#FFFFFF'
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="RULES">Production Rules Only</option>
              <option value="ML">Isolation Forest ML Only</option>
              <option value="COMBINED">Combined Rules + ML</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table & Results Info */}
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
          <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
            Showing {anomalies.length} of {totalCount} total matching signals
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: currentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
                color: currentPage <= 1 ? '#94A3B8' : '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '5px',
                fontSize: '0.8rem',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              style={{
                padding: '0.35rem 0.75rem',
                backgroundColor: currentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
                color: currentPage >= totalPages ? '#94A3B8' : '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '5px',
                fontSize: '0.8rem',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>

        {/* Anomaly Data Table */}
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
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>Review Status</th>
                <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    Loading anomaly signals...
                  </td>
                </tr>
              ) : anomalies.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    No anomaly signals match the current filters.
                  </td>
                </tr>
              ) : (
                anomalies.map((a) => {
                  const riskStyle = getRiskBadgeStyle(a.risk_tier);
                  const statusStyle = getStatusBadgeStyle(a.review_status);

                  return (
                    <tr
                      key={a.anomaly_id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="table-row-hover"
                    >
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
                            backgroundColor: riskStyle.bg,
                            color: riskStyle.color,
                            border: `1px solid ${riskStyle.border}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {a.risk_tier}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748B', fontSize: '0.8rem' }}>{a.detection_source}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {a.review_status}
                        </span>
                      </td>
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
                          Review & Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
