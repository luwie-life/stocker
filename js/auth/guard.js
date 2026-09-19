// js/auth/guard.js — include on every protected page. Redirects to
// login if there's no token, then fetches /me so the page has business/
// role/permission context before rendering.
import { isLoggedIn, api, clearSession } from '../api/client.js';

export async function requireSession() {
  if (!isLoggedIn()) {
    location.href = 'login.html';
    throw new Error('redirecting'); // stop further execution on this page
  }

  try {
    const res = await api.get('/auth/me');
    return res.data; // { user, business, role, permissions, branch }
  } catch (error) {
    if (error.code === 'SUBSCRIPTION_REQUIRED') location.replace('billing.html');
    throw error;
  }
}

export async function requireAuthenticatedSession() {
  if (!isLoggedIn()) {
    location.replace('login.html');
    throw new Error('redirecting');
  }
  try {
    const res = await api.get('/auth/session');
    return res.data;
  } catch (error) {
    location.replace('login.html');
    throw error;
  }
}

window.addEventListener('pageshow', async (event) => {
  if (!event.persisted) return;
  if (!isLoggedIn()) {
    location.replace('login.html');
    return;
  }
  try {
    await api.get('/auth/session');
  } catch {
    location.replace('login.html');
  }
});

export function hasPermission(session, key) {
  return session.permissions.includes(key);
}

export function logout() {
  clearSession();
  location.href = 'login.html';
}
