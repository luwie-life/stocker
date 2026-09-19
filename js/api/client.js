import '../../client-config.js';
import { enqueue, listQueue, removeQueued, queueCount, QUEUE_EVENT } from './offlineQueue.js';

// js/api/client.js — single place all frontend code goes through to talk
// to the backend. Attaches the auth token, normalizes errors, handles
// expired sessions. Never scatter raw fetch() calls across pages.

const API_HOST = window.location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
const configuredApiBase = window.STOCKER_API_BASE?.replace(/\/$/, '');
const API_BASE = configuredApiBase || `http://${API_HOST}:4000/api`;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isMutation = (method) => !['GET', 'HEAD', 'OPTIONS'].includes(method);

async function requestWithRetry(url, options, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (response.status >= 500 && attempt < attempts) { await sleep(400 * 2 ** attempt); continue; }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) { await sleep(400 * 2 ** attempt); continue; }
    }
  }
  throw lastError;
}

export async function apiRequest(path, { method = 'GET', body, query, queueWhenOffline = false, idempotencyKey, replay = false } = {}) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''));
    if ([...qs].length) url += `?${qs.toString()}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await requestWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, method === 'GET' ? 3 : 1);
  } catch (networkErr) {
    if (queueWhenOffline && isMutation(method) && !replay) {
      const queued = await enqueue({ path, method, body, query, idempotencyKey });
      return { success: true, data: { queued: true, queueId: queued.id } };
    }
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

export async function syncOfflineQueue() {
  const items = await listQueue();
  for (const item of items) {
    try {
      await apiRequest(item.path, { ...item, replay: true });
      await removeQueued(item.id);
    } catch (error) {
      if (error.code === 'NETWORK_ERROR') break;
      await removeQueued(item.id);
    }
  }
}

export async function getOfflineQueueCount() {
  return queueCount();
}

window.addEventListener('online', syncOfflineQueue);
if (navigator.onLine) syncOfflineQueue().catch(() => {});
window.addEventListener(QUEUE_EVENT, () => window.dispatchEvent(new CustomEvent('stocker:sync-status')));

export const api = {
  get: (path, query) => apiRequest(path, { method: 'GET', query }),
  post: (path, body, options = {}) => apiRequest(path, { method: 'POST', body, ...options }),
  patch: (path, body, options = {}) => apiRequest(path, { method: 'PATCH', body, ...options }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
