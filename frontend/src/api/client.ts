import type {
  DashboardSummary,
  Anomaly,
  AnomalyDetail,
  AuditLogEntry,
  StudentContext,
  SystemInfo
} from '../types/dashboard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch summary');
  return json.data;
}

export interface AnomalyFilterParams {
  status?: string;
  risk?: string;
  category?: string;
  source?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAnomalies(params: AnomalyFilterParams = {}): Promise<{ data: Anomaly[]; total: number }> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.risk) query.set('risk', params.risk);
  if (params.category) query.set('category', params.category);
  if (params.source) query.set('source', params.source);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_dir) query.set('sort_dir', params.sort_dir);
  query.set('limit', String(params.limit || 50));
  query.set('offset', String(params.offset || 0));

  const res = await fetch(`${API_BASE}/anomalies?${query.toString()}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch anomalies');
  return { data: json.data, total: json.total };
}

export async function fetchAnomalyDetail(anomalyId: string): Promise<AnomalyDetail> {
  const res = await fetch(`${API_BASE}/anomalies/${anomalyId}`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch anomaly detail');
  
  const detailRes = await fetch(`${API_BASE}/anomalies/${anomalyId}/evidence`);
  const detailJson = await detailRes.json();
  
  return {
    ...json.data,
    evidence: detailJson.evidence_rules || [],
    temporal_features: detailJson.temporal_features || {}
  };
}

export async function updateReviewStatus(
  anomalyId: string,
  status: string,
  note: string,
  reviewer: string = 'Administrator (Dev)'
): Promise<Anomaly> {
  const res = await fetch(`${API_BASE}/anomalies/${anomalyId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note, reviewer })
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to update review status');
  return json.data;
}

export async function fetchStudentContext(studentId: string): Promise<StudentContext> {
  const res = await fetch(`${API_BASE}/students/${studentId}/attendance-context`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Student not found');
  return json;
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const res = await fetch(`${API_BASE}/anomalies/SYSTEM/history`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch audit log');
  return json.audit_trail || [];
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch(`${API_BASE}/system/info`);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch system info');
  return json;
}
