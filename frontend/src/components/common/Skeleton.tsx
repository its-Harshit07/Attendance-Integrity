import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '6px',
  style
}) => (
  <div
    aria-hidden="true"
    className="skeleton-pulse"
    style={{
      width,
      height,
      borderRadius,
      flexShrink: 0,
      ...style
    }}
  />
);

export const SkeletonTableRows: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 7
}) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} aria-hidden="true">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx}>
            <Skeleton
              width={cIdx === 0 ? '68%' : cIdx === cols - 1 ? '55%' : `${52 + ((cIdx * 9) % 35)}%`}
              height="0.85rem"
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const OverviewSkeleton: React.FC = () => (
  <div className="section-stack" aria-hidden="true">
    <div>
      <Skeleton width="160px" height="1.75rem" />
      <Skeleton width="320px" height="0.9rem" style={{ marginTop: '0.5rem' }} />
    </div>

    <div className="metrics-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="metric-card" style={{ cursor: 'default' }}>
          <Skeleton width="50%" height="0.75rem" />
          <Skeleton width="42%" height="2.2rem" />
          <Skeleton width="65%" height="0.75rem" />
        </div>
      ))}
    </div>

    <div className="table-panel">
      <div className="table-panel-header">
        <Skeleton width="180px" height="1rem" />
        <Skeleton width="90px" height="1.8rem" />
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <tbody>
            <SkeletonTableRows rows={5} cols={7} />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const AnomalyQueueTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={8} cols={7} />
);

export const AuditLogTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={6} cols={4} />
);
