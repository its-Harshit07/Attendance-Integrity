import React from 'react';

// ---------------------------------------------------------------------------
// Base Skeleton shape
// ---------------------------------------------------------------------------

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  /** aria-hidden is true by default so screen readers skip decorative shapes */
  ariaHidden?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  style,
  ariaHidden = true
}) => (
  <div
    aria-hidden={ariaHidden}
    className="skeleton-pulse"
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: '#E2E8F0',
      flexShrink: 0,
      ...style
    }}
  />
);

// ---------------------------------------------------------------------------
// Convenience: a short text line placeholder
// ---------------------------------------------------------------------------

interface SkeletonTextProps {
  width?: string | number;
  style?: React.CSSProperties;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ width = '60%', style }) => (
  <Skeleton width={width} height="0.85rem" borderRadius="4px" style={style} />
);

// ---------------------------------------------------------------------------
// Metric card skeleton – matches the white-card style used in dashboards
// ---------------------------------------------------------------------------

export const SkeletonMetricCard: React.FC = () => (
  <div
    aria-hidden
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '10px',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem'
    }}
  >
    {/* Label */}
    <Skeleton width="55%" height="0.8rem" />
    {/* Big number */}
    <Skeleton width="40%" height="2rem" borderRadius="6px" />
    {/* Subtitle */}
    <Skeleton width="80%" height="0.7rem" />
  </div>
);

// ---------------------------------------------------------------------------
// Horizontal bar chart row skeleton (used in Risk Tier Distribution)
// ---------------------------------------------------------------------------

export const SkeletonBarRow: React.FC = () => (
  <div aria-hidden style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton width="30%" height="0.8rem" />
      <Skeleton width="10%" height="0.8rem" />
    </div>
    <Skeleton width="100%" height="8px" borderRadius="4px" />
  </div>
);

// ---------------------------------------------------------------------------
// Detection source mini-tile skeleton
// ---------------------------------------------------------------------------

export const SkeletonDetectionTile: React.FC = () => (
  <div
    aria-hidden
    style={{
      backgroundColor: '#F8FAFC',
      padding: '1rem',
      borderRadius: '8px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem'
    }}
  >
    <Skeleton width="60%" height="0.7rem" />
    <Skeleton width="40%" height="1.25rem" borderRadius="4px" />
  </div>
);

// ---------------------------------------------------------------------------
// Table rows skeleton
// ---------------------------------------------------------------------------

interface SkeletonTableRowsProps {
  rows?: number;
  cols?: number;
}

export const SkeletonTableRows: React.FC<SkeletonTableRowsProps> = ({
  rows = 5,
  cols = 6
}) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} aria-hidden style={{ borderBottom: '1px solid #F1F5F9' }}>
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} style={{ padding: '0.75rem' }}>
            <Skeleton
              width={cIdx === 0 ? '70%' : cIdx === cols - 1 ? '50%' : `${55 + ((cIdx * 7) % 35)}%`}
              height="0.85rem"
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ---------------------------------------------------------------------------
// Page-level skeleton: Overview
// ---------------------------------------------------------------------------

export const OverviewSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    {/* Page header */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Skeleton width="260px" height="1.5rem" borderRadius="6px" />
      <Skeleton width="420px" height="0.875rem" />
    </div>

    {/* Metric cards */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem'
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>

    {/* Middle panels */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}
    >
      {/* Risk distribution */}
      <div
        aria-hidden
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        <Skeleton width="200px" height="1rem" borderRadius="6px" />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBarRow key={i} />
        ))}
      </div>

      {/* Detection source breakdown */}
      <div
        aria-hidden
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <Skeleton width="200px" height="1rem" borderRadius="6px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <SkeletonDetectionTile />
          <SkeletonDetectionTile />
          <SkeletonDetectionTile />
        </div>
        <Skeleton width="160px" height="0.875rem" borderRadius="4px" style={{ marginTop: '0.5rem' }} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div
            style={{
              flex: 1,
              backgroundColor: '#EFF6FF',
              padding: '0.75rem',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <Skeleton width="80%" height="0.8rem" />
            <Skeleton width="40%" height="1.1rem" borderRadius="4px" />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#F5F3FF',
              padding: '0.75rem',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <Skeleton width="80%" height="0.8rem" />
            <Skeleton width="40%" height="1.1rem" borderRadius="4px" />
          </div>
        </div>
      </div>
    </div>

    {/* Recent signals table */}
    <div
      aria-hidden
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton width="240px" height="1rem" borderRadius="6px" />
          <Skeleton width="340px" height="0.75rem" />
        </div>
        <Skeleton width="120px" height="2rem" borderRadius="6px" />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['Anomaly ID', 'Student Name', 'Class', 'Date', 'Category', 'Risk Tier', 'Source', 'Action'].map(
                (h) => (
                  <th key={h} style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <SkeletonTableRows rows={5} cols={8} />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page-level skeleton: Anomaly Queue table body
// ---------------------------------------------------------------------------

export const AnomalyQueueTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={8} cols={9} />
);

// ---------------------------------------------------------------------------
// Page-level skeleton: Audit Log table body
// ---------------------------------------------------------------------------

export const AuditLogTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={6} cols={6} />
);

// ---------------------------------------------------------------------------
// Page-level skeleton: Compliance Preview
// ---------------------------------------------------------------------------

export const CompliancePreviewSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {/* Header */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Skeleton width="320px" height="1.5rem" borderRadius="6px" />
      <Skeleton width="460px" height="0.875rem" />
    </div>

    {/* KPI cards */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <SkeletonMetricCard key={i} />
      ))}
    </div>

    {/* Compliance table */}
    <div
      aria-hidden
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >
        <Skeleton width="240px" height="1rem" borderRadius="6px" />
        <Skeleton width="140px" height="2rem" borderRadius="6px" />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            {['Metric Domain', 'Parameter Value', 'Compliance Standard', 'Status'].map((h) => (
              <th key={h} style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SkeletonTableRows rows={4} cols={4} />
        </tbody>
      </table>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page-level skeleton: System Provenance
// ---------------------------------------------------------------------------

export const SystemProvenanceSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    {/* Header */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Skeleton width="300px" height="1.5rem" borderRadius="6px" />
      <Skeleton width="460px" height="0.875rem" />
    </div>

    {/* Banner */}
    <Skeleton width="100%" height="72px" borderRadius="10px" />

    {/* Core parameter cards */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          aria-hidden
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <Skeleton width="55%" height="0.8rem" />
          <Skeleton width="70%" height="1.1rem" borderRadius="4px" />
          <Skeleton width="80%" height="0.75rem" />
        </div>
      ))}
    </div>

    {/* Feature list & rules panels */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}
    >
      {[0, 1].map((panel) => (
        <div
          key={panel}
          aria-hidden
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <Skeleton width="200px" height="1rem" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} width="100%" height="2rem" borderRadius="6px" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Page-level skeleton: Student Context (profile + timeline)
// ---------------------------------------------------------------------------

export const StudentContextSkeleton: React.FC = () => (
  <div
    aria-hidden
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      marginTop: '0.5rem'
    }}
  >
    {/* Profile card */}
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton width="200px" height="1.25rem" borderRadius="6px" />
          <Skeleton width="300px" height="0.85rem" />
        </div>
        <Skeleton width="140px" height="2rem" borderRadius="6px" />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#F8FAFC',
              padding: '1rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <Skeleton width="70%" height="0.75rem" />
            <Skeleton width="40%" height="1.5rem" borderRadius="4px" />
          </div>
        ))}
      </div>
    </div>

    {/* Attendance timeline */}
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <Skeleton width="240px" height="1rem" borderRadius="6px" style={{ marginBottom: '1rem' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
            {['Record ID', 'Date', 'Day', 'Status', 'Raw Mark', 'School Day'].map((h) => (
              <th key={h} style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SkeletonTableRows rows={8} cols={6} />
        </tbody>
      </table>
    </div>
  </div>
);
