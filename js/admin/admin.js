import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import { emptyState, escapeHtml, formatMoney, showToast } from '../shared/ui.js';

const session = await requireSession();
if (!session.permissions.includes('settings.manage')) {
  location.href = 'index.html';
  throw new Error('admin permission required');
}
renderShell(session, 'admin.html');
const content = document.getElementById('admin-content');

function render(data) {
  const { summary, branches, products, sales } = data;
  content.innerHTML = `
    <div class="stats-grid">
      <div class="card stat-card"><span class="stat-label">Sales today</span><strong class="stat-value">${formatMoney(summary.todaySalesMinor, session.business.currency)}</strong><span class="stat-sub">${summary.todayTransactionCount} transaction(s)</span></div>
      <div class="card stat-card"><span class="stat-label">Products</span><strong class="stat-value">${products.meta?.total ?? products.data.length}</strong><span class="stat-sub">Active catalogue items</span></div>
      <div class="card stat-card"><span class="stat-label">Locations</span><strong class="stat-value">${branches.data.length}</strong><span class="stat-sub">Configured branches</span></div>
      <div class="card stat-card"><span class="stat-label">Low stock</span><strong class="stat-value">${summary.lowStockCount}</strong><span class="stat-sub">Items needing attention</span></div>
    </div>
    <div class="admin-grid">
      <section class="card"><div class="section-header"><div><h2 class="card-title">Branches</h2><p class="card-subtitle">Locations currently connected to this business.</p></div><a class="btn btn-secondary" href="inventory.html">Manage stock</a></div>
        <form id="branch-form" class="inline-form"><input id="branch-name" placeholder="Branch name" aria-label="Branch name" required><input id="branch-code" placeholder="Code" aria-label="Branch code" required><button class="btn btn-primary" type="submit">Add branch</button></form>
        ${branches.data.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th></tr></thead><tbody>${branches.data.map((branch) => `<tr><td>${escapeHtml(branch.name)}</td><td>${escapeHtml(branch.code)}</td><td><span class="badge ${branch.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}">${escapeHtml(branch.status)}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No branches configured yet.</div>'}
      </section>
      <section class="card"><div class="section-header"><div><h2 class="card-title">Recent activity</h2><p class="card-subtitle">Latest sales recorded by your team.</p></div><a class="btn btn-secondary" href="sales.html">View POS</a></div>
        ${sales.data.length ? `<div class="table-wrap"><table><thead><tr><th>Sale</th><th>Total</th><th>When</th></tr></thead><tbody>${sales.data.slice(0, 6).map((sale) => `<tr><td>${escapeHtml(sale.saleNumber)}</td><td>${formatMoney(sale.totalMinor, sale.currency)}</td><td>${escapeHtml(new Date(sale.createdAt).toLocaleString())}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">No sales yet. Completed sales will appear here.</div>'}
      </section>
    </div>`;
  content.querySelector('#branch-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api.post('/branches', { name: content.querySelector('#branch-name').value.trim(), code: content.querySelector('#branch-code').value.trim() });
      showToast('Branch added.', 'success');
      await load();
    } catch (error) { showToast(error.message, 'error'); }
  });
}

try {
  const [summary, branches, products, sales] = await Promise.all([
    api.get('/analytics/summary'), api.get('/branches'), api.get('/products', { page: 1, limit: 1 }), api.get('/sales', { page: 1, limit: 6 }),
  ]);
  render({ summary: summary.data, branches, products, sales });
} catch (err) {
  emptyState(content, { title: 'Admin workspace unavailable', message: err.message, actionLabel: 'Return to dashboard', onAction: () => { location.href = 'index.html'; } });
  showToast(err.message, 'error');
}
