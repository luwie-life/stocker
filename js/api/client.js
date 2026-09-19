import '../../client-config.js';

// js/api/client.js — single place all frontend code goes through to talk
// to the backend. Attaches the auth token, normalizes errors, handles
// expired sessions. Never scatter raw fetch() calls across pages.

const API_HOST = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const API_BASE = window.STOCKER_API_BASE || `http://${API_HOST}:4000/api`;

export function getToken() {
  return localStorage.getItem('stocker_token');
}

export function setSession(token) {
  localStorage.setItem('stocker_token', token);
}

export function clearSession() {
  localStorage.removeItem('stocker_token');
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(path, { method = 'GET', body, query } = {}) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''));
    if ([...qs].length) url += `?${qs.toString()}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response (e.g. 204, or server crash) — fall through
  }

  if (res.status === 401) {
    clearSession();
    if (!location.pathname.endsWith('login.html')) {
      location.href = 'login.html';
    }
    throw new ApiError(payload?.message || 'Session expired. Please log in again.', 401, payload?.code);
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || 'Something went wrong.', res.status, payload?.code);
  }

  return payload; // { success, data, meta? }
}

export const api = {
  get: (path, query) => apiRequest(path, { method: 'GET', query }),
  post: (path, body) => apiRequest(path, { method: 'POST', body }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
