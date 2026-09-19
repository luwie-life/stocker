import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import { formatMoney, emptyState, showToast, escapeHtml } from '../shared/ui.js';

const session = await requireSession();
renderShell(session, 'index.html');

const statsGrid = document.getElementById('stats-grid');
const recentSalesEl = document.getElementById('recent-sales');
const notificationsEl = document.createElement('div');
notificationsEl.className = 'card notification-panel';
notificationsEl.innerHTML = '<div class="section-header"><div><h2 class="card-title">Notifications</h2><p class="card-subtitle">Replies and important updates for your account.</p></div><span class="attention-label">Attention</span></div><div id="notification-list"><div class="empty-state">Loading…</div></div>';
recentSalesEl.parentElement.after(notificationsEl);

function statCard(label, value, sub) {
  return `
    <div class="card stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${escapeHtml(value)}</div>
      ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ''}
    </div>
  `;
}

try {
  const res = await api.get('/analytics/summary');
  const d = res.data;
  const currency = session.business.currency;

  statsGrid.innerHTML =
    statCard("Today's sales", formatMoney(d.todaySalesMinor, currency), `${d.todayTransactionCount} transaction(s)`) +
    statCard('This month', formatMoney(d.monthSalesMinor, currency), `${d.monthTransactionCount} transaction(s)`) +
    statCard('Low stock items', d.lowStockCount, d.lowStockCount > 0 ? 'Needs restocking' : 'All good');

  if (d.recentSales.length === 0) {
    emptyState(recentSalesEl, {
      title: 'No sales yet',
      message: 'Complete your first sale to start seeing performance data here.',
      actionLabel: 'Go to POS',
      onAction: () => (location.href = 'sales.html'),
    });
  } else {
    recentSalesEl.innerHTML = `
      <table>
        <thead><tr><th>Sale #</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>
          ${d.recentSales.map((s) => `
            <tr>
              <td>${escapeHtml(s.saleNumber)}</td>
              <td>${s.items.length}</td>
              <td>${formatMoney(s.totalMinor, s.currency)}</td>
              <td><span class="badge badge-${s.paymentStatus === 'PAID' ? 'success' : 'muted'}">${escapeHtml(s.paymentStatus)}</span></td>
              <td>${new Date(s.createdAt).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
} catch (err) {
  showToast(err.message, 'error');
}

try {
  const notifications = await api.get('/notifications');
  const list = document.getElementById('notification-list');
  if (!notifications.data.length) emptyState(list, { title: 'You are all caught up', message: 'New replies and account updates will appear here.' });
  else list.innerHTML = notifications.data.slice(0, 8).map((item) => `<div class="notification-row ${item.readAt ? '' : 'notification-unread'}"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.message)}</span></div>${item.readAt ? '' : `<button class="btn btn-secondary mark-notification" data-id="${item._id}" type="button">Mark read</button>`}</div>`).join('');
  list.querySelectorAll('.mark-notification').forEach((button) => button.addEventListener('click', async () => { await api.patch(`/notifications/${button.dataset.id}/read`); button.closest('.notification-row').classList.remove('notification-unread'); button.remove(); }));
} catch (err) {
  document.getElementById('notification-list').innerHTML = '<div class="empty-state">Notifications are unavailable.</div>';
}
