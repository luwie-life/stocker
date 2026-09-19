import { api, clearSession } from '../api/client.js';
import { requireAuthenticatedSession } from '../auth/guard.js';
import { escapeHtml, formatMoney, showToast } from '../shared/ui.js';
const content = document.getElementById('ambassador-content');
document.getElementById('ambassador-logout').addEventListener('click', () => { clearSession(); location.href = 'login.html'; });
try {
  await requireAuthenticatedSession();
} catch (error) {
  content.innerHTML = `<div class="empty-state"><h3>Ambassador session unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
  throw error;
}
window.addEventListener('pageshow', async (event) => { if (event.persisted) await requireAuthenticatedSession(); });
try {
  const result = await api.get('/ambassadors/me');
  const { ambassador, referrals, commissions } = result.data;
  const total = commissions.reduce((sum, item) => sum + item.amountMinor, 0);
  const messages = await api.get('/ambassadors/me/messages').catch(() => ({ data: [] }));
  content.innerHTML = `<p class="eyebrow">Field marketing</p><h1 class="page-heading">Ambassador dashboard</h1><p class="page-intro">Share your link, follow your target, and stay in direct contact with the platform team.</p><section class="card referral-card"><span class="stat-label">Your referral link</span><strong>${escapeHtml(`${location.origin}/login.html?ref=${ambassador.referralCode}#register`)}</strong><small>Code: ${escapeHtml(ambassador.referralCode)} · Status: ${escapeHtml(ambassador.status)}</small></section><div class="stats-grid"><div class="card stat-card"><span class="stat-label">Businesses referred</span><strong class="stat-value">${referrals.length}</strong></div><div class="card stat-card"><span class="stat-label">Current target</span><strong class="stat-value">${ambassador.target?.referrals || 0}</strong><span class="stat-sub">${escapeHtml(ambassador.target?.period || 'MONTHLY')}</span></div><div class="card stat-card"><span class="stat-label">Commission earned</span><strong class="stat-value">${formatMoney(total)}</strong><span class="stat-sub">10% recurring rate</span></div></div><div class="admin-grid"><section class="card"><div class="section-header"><div><h2 class="card-title">Referred businesses</h2><p class="card-subtitle">Attribution is recorded server-side at registration.</p></div></div>${referrals.length ? `<div class="table-wrap"><table><thead><tr><th>Business</th><th>Status</th><th>Joined</th></tr></thead><tbody>${referrals.map((referral) => `<tr><td>${escapeHtml(referral.business?.name || 'Business')}</td><td>${escapeHtml(referral.status)}</td><td>${escapeHtml(new Date(referral.createdAt).toLocaleDateString())}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No referrals yet. Share your link to get started.</div>'}</section><section class="card"><div class="section-header"><div><h2 class="card-title">Message platform admin</h2><p class="card-subtitle">Ask a question or share a progress update.</p></div></div><form id="ambassador-message-form" class="stacked-form"><div class="field"><label>Subject</label><input id="ambassador-message-subject" required></div><div class="field"><label>Message</label><textarea id="ambassador-message-body" rows="5" required></textarea></div><button class="btn btn-primary" type="submit">Send message</button></form></section></div><section class="card"><div class="section-header"><div><h2 class="card-title">Messages from the platform</h2><p class="card-subtitle">Updates and replies from your admin team.</p></div></div>${messages.data.length ? messages.data.map((item) => `<article class="feedback-item"><div class="section-header"><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(new Date(item.createdAt).toLocaleString())}</small></div><p>${escapeHtml(item.message)}</p><small>From ${escapeHtml(item.sender?.fullName || 'Platform admin')}</small></article>`).join('') : '<div class="empty-state">No messages yet.</div>'}</section>`;
  document.getElementById('ambassador-message-form').addEventListener('submit', async (event) => { event.preventDefault(); try { await api.post('/ambassadors/me/messages', { subject: document.getElementById('ambassador-message-subject').value.trim(), message: document.getElementById('ambassador-message-body').value.trim() }); event.target.reset(); showToast('Message sent to platform admin.', 'success'); } catch (error) { showToast(error.message, 'error'); } });
} catch (error) {
  if (error.code === 'NOT_AMBASSADOR') {
    location.replace('index.html');
    throw error;
  }
  content.innerHTML = `<div class="empty-state"><h3>Ambassador dashboard unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
  showToast(error.message, 'error');
}
