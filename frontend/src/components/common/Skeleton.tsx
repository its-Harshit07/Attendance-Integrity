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
  borderRadius = '8px',
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
  <div className="gw-view" aria-hidden="true">
    <div>
      <Skeleton width="100px" height="0.85rem" />
      <Skeleton width="180px" height="2rem" style={{ marginTop: '0.45rem' }} />
      <Skeleton width="300px" height="0.85rem" style={{ marginTop: '0.45rem' }} />
    </div>

    <div className="gw-overview-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="gw-panel">
          <Skeleton width="45%" height="0.95rem" />
          <Skeleton width="38%" height="2.4rem" />
          <Skeleton width="100%" height="3.2rem" borderRadius="12px" />
        </div>
      ))}
    </div>
  </div>
);

export const AnomalyQueueTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={8} cols={7} />
);

export const AuditLogTableSkeleton: React.FC = () => (
  <SkeletonTableRows rows={6} cols={4} />
);
