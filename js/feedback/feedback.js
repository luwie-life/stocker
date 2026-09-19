import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import { emptyState, escapeHtml, showToast, withButtonLoading } from '../shared/ui.js';
const session = await requireSession();
renderShell(session, 'feedback.html');
const list = document.getElementById('feedback-list');
async function load() {
  list.innerHTML = '<div class="empty-state">Loading messages…</div>';
  try {
    const result = await api.get('/feedback');
    if (!result.data.length) { emptyState(list, { title: 'Nothing here yet', message: 'Send a message when you need help or have an idea.' }); return; }
    list.innerHTML = result.data.map((item) => `<article class="feedback-item"><div class="section-header"><strong>${escapeHtml(item.subject)}</strong><span class="badge badge-muted">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.message)}</p>${item.adminResponse ? `<div class="feedback-reply"><strong>stocker team</strong><p>${escapeHtml(item.adminResponse)}</p></div>` : '<small class="topbar-meta">Awaiting a reply</small>'}</article>`).join('');
  } catch (error) { list.innerHTML = '<div class="empty-state"><h3>Messages unavailable</h3><p>Try refreshing in a moment.</p></div>'; showToast(error.message, 'error'); }
}
document.getElementById('feedback-form').addEventListener('submit', async (event) => { event.preventDefault(); await withButtonLoading(document.getElementById('feedback-submit'), 'Sending…', async () => { try { await api.post('/feedback', { type: document.getElementById('feedback-type').value, subject: document.getElementById('feedback-subject').value.trim(), message: document.getElementById('feedback-message').value.trim() }); event.target.reset(); showToast('Feedback sent. We will reply here.', 'success'); await load(); } catch (error) { showToast(error.message, 'error'); } }); });
document.getElementById('refresh-feedback').addEventListener('click', load);
await load();
