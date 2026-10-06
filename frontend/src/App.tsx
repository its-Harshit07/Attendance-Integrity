import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/layout/Layout';
import { OverviewView } from './components/dashboard/OverviewView';
import { AnomalyQueueView } from './components/anomalies/AnomalyQueueView';
import { AnomalyDetailDrawer } from './components/anomalies/AnomalyDetailDrawer';
import { StudentContextView } from './components/students/StudentContextView';
import { CompliancePreviewView } from './components/reports/CompliancePreviewView';
import { AuditLogView } from './components/audit/AuditLogView';
import { SystemProvenanceView } from './components/system/SystemProvenanceView';

import type {
  DashboardSummary,
  Anomaly,
  AnomalyDetail
} from './types/dashboard';
import {
  fetchSummary,
  fetchAnomalies,
  fetchAnomalyDetail,
  type AnomalyFilterParams
} from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');

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

  // Recent high priority state for Overview
  const [recentAnomalies, setRecentAnomalies] = useState<Anomaly[]>([]);

  // Selected detail drawer state
  const [selectedAnomalyDetail, setSelectedAnomalyDetail] = useState<AnomalyDetail | null>(null);

  // Student Context state
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);

  // Load summary
  const loadSummaryData = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await fetchSummary();
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
      setSummaryError(err.message || 'Failed to connect to REST API');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Load anomaly queue
  const loadQueueData = useCallback(async (params: AnomalyFilterParams) => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const res = await fetchAnomalies(params);
      setAnomalies(res.data);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error('Failed to load anomalies:', err);
      setQueueError(err.message || 'Failed to load anomalies');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // Load recent high priority anomalies for Overview
  const loadRecentAnomalies = useCallback(async () => {
    try {
      const res = await fetchAnomalies({ status: 'UNREVIEWED', limit: 5 });
      setRecentAnomalies(res.data);
    } catch (err) {
      console.error('Failed to load recent anomalies:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSummaryData();
    loadQueueData(filterParams);
    loadRecentAnomalies();
  }, [loadSummaryData, loadRecentAnomalies]);

  // Handle filter changes
  const handleFilterChange = (newParams: AnomalyFilterParams) => {
    setFilterParams(newParams);
    loadQueueData(newParams);
  };

  // Open detail drawer
  const handleSelectAnomaly = async (anomalyId: string) => {
    try {
      const detail = await fetchAnomalyDetail(anomalyId);
      setSelectedAnomalyDetail(detail);
    } catch (err) {
      console.error('Failed to fetch anomaly detail:', err);
    }
  };

  // Callback when review decision submitted
  const handleReviewSubmitted = () => {
    loadSummaryData();
    loadQueueData(filterParams);
    loadRecentAnomalies();
    if (selectedAnomalyDetail) {
      handleSelectAnomaly(selectedAnomalyDetail.anomaly_id);
    }
  };

  // Navigate to Queue with quick filter
  const handleNavigateToQueue = (filter?: { risk?: string; status?: string }) => {
    const updated = {
      ...filterParams,
      status: filter?.status,
      risk: filter?.risk,
      offset: 0
    };
    setFilterParams(updated);
    loadQueueData(updated);
    setActiveTab('anomalies');
  };

  // Navigate to Student Context view
  const handleViewStudentContext = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('students');
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview' && (
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

      {activeTab === 'anomalies' && (
        <AnomalyQueueView
          anomalies={anomalies}
          totalCount={totalCount}
          filterParams={filterParams}
          onFilterChange={handleFilterChange}
          onSelectAnomaly={handleSelectAnomaly}
          loading={loadingQueue}
          error={queueError}
        />
      )}

      {activeTab === 'students' && (
        <StudentContextView
          initialStudentId={selectedStudentId}
          onSelectAnomaly={handleSelectAnomaly}
        />
      )}

      {activeTab === 'compliance' && <CompliancePreviewView summary={summary} />}

      {activeTab === 'audit' && <AuditLogView />}

      {activeTab === 'system' && <SystemProvenanceView />}

      {/* Slide-over Detail Drawer */}
      <AnomalyDetailDrawer
        anomaly={selectedAnomalyDetail}
        onClose={() => setSelectedAnomalyDetail(null)}
        onReviewSubmitted={handleReviewSubmitted}
        onViewStudentContext={handleViewStudentContext}
      />
    </Layout>
  );
};

export default App;
