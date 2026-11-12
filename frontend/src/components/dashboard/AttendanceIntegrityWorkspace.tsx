import React, { useCallback, useEffect, useState } from 'react';
import {
  GlassWorkspace,
  type GlassNavId,
  warmPalette
} from '../ui/adjustable-glass-dashboard';
import { OverviewView } from './OverviewView';
import { AnomalyQueueView } from '../anomalies/AnomalyQueueView';
import { AnomalyDetailDrawer } from '../anomalies/AnomalyDetailDrawer';
import { AuditLogView } from '../audit/AuditLogView';
import { ReportsView } from '../reports/ReportsView';
import type { Anomaly, AnomalyDetail, DashboardSummary } from '../../types/dashboard';
import {
  fetchAnomalies,
  fetchAnomalyDetail,
  fetchHealth,
  fetchSummary,
  type AnomalyFilterParams
} from '../../api/client';

const ROOM_BACKGROUND_IMAGE =
  'https://cdn.21st.dev/assets/mirror/4a/4a0ed73b8ab76bd427aa70ab124329127f3df27cc7f31223a832ed7d28b3dda4.jpg';

export const AttendanceIntegrityWorkspace: React.FC = () => {
  const [activeNav, setActiveNav] = useState<GlassNavId>('overview');
  const [healthState, setHealthState] = useState<'checking' | 'operational' | 'degraded'>('checking');

  // Summary state
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Queue state
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filterParams, setFilterParams] = useState<AnomalyFilterParams>({
    limit: 50,
    offset: 0
  });
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Recent unreviewed signals for Overview
  const [recentAnomalies, setRecentAnomalies] = useState<Anomaly[]>([]);

  // Detail drawer state
  const [selectedAnomalyDetail, setSelectedAnomalyDetail] = useState<AnomalyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadSummaryData = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await fetchSummary();
      setSummary(data);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to connect to REST API');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadQueueData = useCallback(async (params: AnomalyFilterParams) => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const res = await fetchAnomalies(params);
      setAnomalies(res.data);
      setTotalCount(res.total);
    } catch (err: any) {
      setQueueError(err.message || 'Failed to load anomalies');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadRecentAnomalies = useCallback(async () => {
    try {
      const res = await fetchAnomalies({ status: 'UNREVIEWED', limit: 6 });
      setRecentAnomalies(res.data);
    } catch {
      // Summary error state surfaces API connectivity issues
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then((res) => {
        if (!active) return;
        const ok = res.status === 'ok' && res.database === 'connected';
        setHealthState(ok ? 'operational' : 'degraded');
      })
      .catch(() => {
        if (active) setHealthState('degraded');
      });

    fetchSummary()
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setSummaryError(null);
        setLoadingSummary(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setSummaryError(err.message || 'Failed to connect to REST API');
        setLoadingSummary(false);
      });

    fetchAnomalies({ limit: 50, offset: 0 })
      .then((res) => {
        if (!active) return;
        setAnomalies(res.data);
        setTotalCount(res.total);
        setQueueError(null);
        setLoadingQueue(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setQueueError(err.message || 'Failed to load anomalies');
        setLoadingQueue(false);
      });

    fetchAnomalies({ status: 'UNREVIEWED', limit: 6 })
      .then((res) => {
        if (!active) return;
        setRecentAnomalies(res.data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleFilterChange = (newParams: AnomalyFilterParams) => {
    setFilterParams(newParams);
    loadQueueData(newParams);
  };

  const handleSelectAnomaly = async (anomalyId: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await fetchAnomalyDetail(anomalyId);
      setSelectedAnomalyDetail(detail);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to fetch anomaly details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedAnomalyDetail(null);
    setDetailError(null);
    setLoadingDetail(false);
  };

  const handleReviewSubmitted = () => {
    loadSummaryData();
    loadQueueData(filterParams);
    loadRecentAnomalies();
    if (selectedAnomalyDetail) {
      handleSelectAnomaly(selectedAnomalyDetail.anomaly_id);
    }
  };

  const handleNavigateToQueue = (filter?: { risk?: string; status?: string }) => {
    const updated: AnomalyFilterParams = {
      ...filterParams,
      status: filter?.status,
      risk: filter?.risk,
      offset: 0
    };
    setFilterParams(updated);
    loadQueueData(updated);
    setActiveNav('anomalies');
  };

  return (
    <>
      <GlassWorkspace
        brand="Attendance Integrity"
        workspaceLabel="Administrator Workspace"
        backgroundImage={ROOM_BACKGROUND_IMAGE}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        healthState={healthState}
        style={warmPalette}
        footerNote="AI-assisted attendance monitoring · Records require human verification"
      >
        {activeNav === 'overview' && (
          <OverviewView
            summary={summary}
            recentAnomalies={recentAnomalies}
            onSelectAnomaly={handleSelectAnomaly}
            onNavigateToQueue={handleNavigateToQueue}
            loading={loadingSummary}
            error={summaryError}
            onRetry={loadSummaryData}
          />
        )}

        {activeNav === 'anomalies' && (
          <AnomalyQueueView
            anomalies={anomalies}
            totalCount={totalCount}
            filterParams={filterParams}
            onFilterChange={handleFilterChange}
            onSelectAnomaly={handleSelectAnomaly}
            loading={loadingQueue}
            error={queueError}
            onRetry={() => loadQueueData(filterParams)}
          />
        )}

        {activeNav === 'audit' && <AuditLogView onSelectAnomaly={handleSelectAnomaly} />}

        {activeNav === 'reports' && <ReportsView />}
      </GlassWorkspace>

      <AnomalyDetailDrawer
        anomaly={selectedAnomalyDetail}
        loading={loadingDetail}
        error={detailError}
        onClose={handleCloseDrawer}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
};

