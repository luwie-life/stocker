import { api } from '../api/client.js';

document.getElementById('reset-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('reset-status');
  const password = document.getElementById('reset-password').value;
  if (password !== document.getElementById('reset-confirm').value) { status.textContent = 'Passwords do not match.'; status.className = 'auth-status auth-status-error'; return; }
  try {
    await api.post('/auth/reset-password', { token: new URLSearchParams(location.search).get('token') || '', password });
    status.textContent = 'Password reset successfully. Redirecting to sign in…';
    status.className = 'auth-status auth-status-success';
    setTimeout(() => { location.href = 'login.html'; }, 1200);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'auth-status auth-status-error';
  }
});