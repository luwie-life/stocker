import { api } from '../api/client.js';

document.getElementById('forgot-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('forgot-status');
  try {
    await api.post('/auth/forgot-password', { email: document.getElementById('forgot-email').value.trim() });
    status.textContent = 'If an account exists for that email, a reset link has been sent.';
    status.className = 'auth-status auth-status-success';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'auth-status auth-status-error';
  }
});