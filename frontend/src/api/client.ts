import type {
  DashboardSummary,
  Anomaly,
  AnomalyDetail,
  AuditLogEntry,
  StudentContext,
  SystemInfo,
  HealthStatus,
  CompliancePreview
} from '../types/dashboard';

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  let url = envUrl.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

export const API_BASE = getApiBaseUrl();

let activeCsrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function setCsrfToken(token: string | null): void {
  activeCsrfToken = token;
}

export function getCsrfToken(): string | null {
  if (activeCsrfToken) return activeCsrfToken;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)attendance_csrf=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function secureFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  
  // Attach CSRF token on state-changing requests
  const method = (init.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'same-origin'
  });

  if (response.status === 401 && !url.includes('/auth/session')) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  return response;
}

async function parseJsonResponse(res: Response, fallbackError: string): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `API error (${res.status}): Received non-JSON response (${contentType || 'text/html'}). Check backend API routing and proxy configuration.`
    );
  }
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.detail || json.error || fallbackError);
  }
  return json;
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

export interface SessionStatus {
  authenticated: boolean;
  email?: string | null;
  csrf_token?: string | null;
}

export async function requestOtp(email: string): Promise<{ status: string; message: string }> {
  const res = await secureFetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() })
  });
  return await parseJsonResponse(res, 'Failed to request verification code');
}

export async function verifyOtp(email: string, otp: string): Promise<{ status: string; email: string; csrf_token: string }> {
  const res = await secureFetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
  });
  const data = await parseJsonResponse(res, 'Failed to verify verification code');
  if (data.csrf_token) {
    setCsrfToken(data.csrf_token);
  }
  return data;
}

export async function fetchSession(): Promise<SessionStatus> {
  try {
    const res = await secureFetch(`${API_BASE}/auth/session`);
    const json = await parseJsonResponse(res, 'Failed to inspect session');
    if (json.authenticated && json.csrf_token) {
      setCsrfToken(json.csrf_token);
    }
    return json;
  } catch {
    return { authenticated: false, email: null, csrf_token: null };
  }
}

export async function logout(): Promise<void> {
  try {
    await secureFetch(`${API_BASE}/auth/logout`, {
      method: 'POST'
    });
  } catch {
    // Fail-closed: ignore errors if session was already revoked or unauthenticated
  } finally {
    setCsrfToken(null);
  }
}

// ==========================================
// PROTECTED DASHBOARD APIs
// ==========================================

export async function fetchSummary(): Promise<DashboardSummary> {
  const res = await secureFetch(`${API_BASE}/dashboard/summary`);
  const json = await parseJsonResponse(res, 'Failed to fetch summary');
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

  const res = await secureFetch(`${API_BASE}/anomalies?${query.toString()}`);
  const json = await parseJsonResponse(res, 'Failed to fetch anomalies');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch anomalies');
  return { data: json.data, total: json.total };
}

export async function fetchAnomalyDetail(anomalyId: string): Promise<AnomalyDetail> {
  const res = await secureFetch(`${API_BASE}/anomalies/${anomalyId}`);
  const json = await parseJsonResponse(res, 'Failed to fetch anomaly detail');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch anomaly detail');

  const detailRes = await secureFetch(`${API_BASE}/anomalies/${anomalyId}/evidence`);
  const detailJson = await parseJsonResponse(detailRes, 'Failed to fetch anomaly evidence');

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
  reviewer: string = 'Administrator'
): Promise<Anomaly> {
  const res = await secureFetch(`${API_BASE}/anomalies/${anomalyId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note, reviewer })
  });
  const json = await parseJsonResponse(res, 'Failed to update review status');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to update review status');
  return json.data;
}

export async function fetchStudentContext(studentId: string): Promise<StudentContext> {
  const res = await secureFetch(`${API_BASE}/students/${studentId}/attendance-context`);
  const json = await parseJsonResponse(res, 'Student not found');
  if (json.status !== 'success') throw new Error(json.detail || 'Student not found');
  return json;
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const res = await secureFetch(`${API_BASE}/anomalies/SYSTEM/history`);
  const json = await parseJsonResponse(res, 'Failed to fetch audit log');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch audit log');
  return json.audit_trail || [];
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await secureFetch(`${API_BASE}/system/info`);
  const json = await parseJsonResponse(res, 'Failed to fetch system info');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch system info');
  return json;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await secureFetch(`${API_BASE}/health`);
  return await parseJsonResponse(res, 'Failed to fetch system health');
}

export async function fetchCompliancePreview(): Promise<CompliancePreview> {
  const res = await secureFetch(`${API_BASE}/reports/compliance-preview`);
  const json = await parseJsonResponse(res, 'Failed to fetch compliance preview');
  if (json.status !== 'success') throw new Error(json.detail || 'Failed to fetch compliance preview');
  return json;
}
