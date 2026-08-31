// API client for the Pinoy Ride HR C# backend.
// Fall back to same-origin when VITE_API_URL isn't set (the Vite dev proxy
// forwards /api and /auth to the backend during development).
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
// Backend endpoints are documented in HRPinoyRideBackEnd/README.md.

const TOKEN_KEY = 'pinoyride_auth';
let token = null;
let onUnauthorized = null;

export function setToken(value) {
  token = value || null;
}

export function getToken() {
  return token;
}

export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    const err = new Error('Cannot reach the API server.');
    err.status = 0;
    throw err;
  }

  if (res.status === 401 && token) {
    if (onUnauthorized) onUnauthorized();
    const err = new Error('Your session has expired. Please log in again.');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),

  clockIn: () => request('/api/clock/in', { method: 'POST' }),
  clockOut: () => request('/api/clock/out', { method: 'POST' }),
  clockToday: () => request('/api/clock/today'),

  createRequest: (payload) => request('/api/requests', { method: 'POST', body: payload }),
  myRequests: () => request('/api/requests/mine'),

  approvals: () => request('/api/approvals'),
  approve: (id, notes) => request(`/api/approvals/${id}/approve`, { method: 'POST', body: { notes } }),
  reject: (id, notes) => request(`/api/approvals/${id}/reject`, { method: 'POST', body: { notes } }),

  staff: (params) => request(`/api/staff${qs(params)}`),
  createStaff: (payload) => request('/api/staff', { method: 'POST', body: payload }),
  updateStaff: (id, payload) => request(`/api/staff/${id}`, { method: 'PUT', body: payload }),
  deactivateStaff: (id) => request(`/api/staff/${id}/deactivate`, { method: 'POST' }),

  reports: (params) => request(`/api/reports${qs(params)}`),
  downloadReport: async (params) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API_URL + `/api/reports/export${qs(params)}`, { headers });
    if (!res.ok) {
      const err = new Error(`Export failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};