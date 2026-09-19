import { logout } from '../auth/guard.js';
import { api } from '../api/client.js';

const NAV_ITEMS = [
  { href: 'index.html', label: 'Dashboard', icon: '01' },
  { href: 'sales.html', label: 'Point of sale', icon: '02' },
  { href: 'inventory.html', label: 'Inventory', icon: '03' },
];

export function renderShell(session, activeHref) {
  const sidebar = document.getElementById('sidebar');
  const topbarBusiness = document.getElementById('topbar-business');
  const topbarUser = document.getElementById('topbar-user');
  const logoutBtn = document.getElementById('logout-btn');

  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="wordmark">stocker</div>
        <div class="sidebar-caption">Retail operations</div>
      </div>
      <div class="nav-kicker">Workspace</div>
      <nav>
        ${NAV_ITEMS.map((item) => `<a href="${item.href}" class="${item.href === activeHref ? 'active' : ''}"><span aria-hidden="true">${item.icon}</span><span>${item.label}</span></a>`).join('')}
        ${session.permissions.includes('settings.manage') ? `<a href="admin.html" class="${activeHref === 'admin.html' ? 'active' : ''}"><span aria-hidden="true">04</span><span>Admin</span></a>` : ''}
        <a href="feedback.html" class="${activeHref === 'feedback.html' ? 'active' : ''}"><span aria-hidden="true">05</span><span>Help & feedback</span></a>
        ${session.permissions.includes('sales.view') ? `<a href="invoices.html" class="${activeHref === 'invoices.html' ? 'active' : ''}"><span aria-hidden="true">06</span><span>Invoices</span></a>` : ''}
        ${session.permissions.includes('staff.view') ? `<a href="staff.html" class="${activeHref === 'staff.html' ? 'active' : ''}"><span aria-hidden="true">07</span><span>Staff</span></a>` : ''}
      </nav>
      <div class="sidebar-footer">${session.business.type || 'Business'}<br>${session.branch?.name || 'All assigned locations'}</div>
    `;
  }
  if (topbarBusiness) topbarBusiness.textContent = session.business.name;
  if (topbarUser) topbarUser.textContent = `${session.user.fullName} · ${session.role}`;
  if (session.subscription && !document.querySelector('.subscription-banner')) {
    const banner = document.createElement('div');
    const endsAt = session.subscription.status === 'TRIAL' ? session.subscription.trialEndsAt : session.subscription.accessEndsAt;
    const days = endsAt ? Math.max(0, Math.ceil((new Date(endsAt) - Date.now()) / 86400000)) : null;
    banner.className = `subscription-banner ${days !== null && days <= 2 ? 'subscription-urgent' : ''}`;
    banner.innerHTML = `<span><strong>${session.subscription.status === 'TRIAL' ? 'Free trial' : session.subscription.plan}:</strong> ${days === null ? 'Access active' : `${days} day${days === 1 ? '' : 's'} remaining`}</span><span>${session.subscription.status === 'TRIAL' ? 'Choose a plan before access pauses.' : 'Your workspace is active.'} <a href="billing.html">Manage billing</a></span>`;
    document.querySelector('.main-content')?.prepend(banner);
  }
  const topbarActions = document.querySelector('.topbar-actions');
  if (topbarActions) {
    const notificationButton = document.createElement('button');
    notificationButton.className = 'notification-bell';
    notificationButton.type = 'button';
    notificationButton.setAttribute('aria-label', 'Notifications');
    notificationButton.innerHTML = '<span aria-hidden="true">!</span><b class="notification-count">0</b>';
    notificationButton.addEventListener('click', () => document.querySelector('.notification-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    topbarActions.prepend(notificationButton);
    api.get('/notifications').then((result) => {
      const unread = result.data.filter((item) => !item.readAt);
      const count = notificationButton.querySelector('.notification-count');
      count.textContent = unread.length > 99 ? '99+' : String(unread.length);
      count.classList.toggle('is-empty', unread.length === 0);
      unread.slice(0, 3).forEach((item, index) => setTimeout(() => {
        const toast = document.createElement('div');
        toast.className = 'attention-toast';
        const title = document.createElement('strong');
        const message = document.createElement('span');
        title.textContent = item.title;
        message.textContent = item.message;
        toast.append(title, message);
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 6500);
      }, index * 250));
    }).catch(() => {});
  }
  if (topbarActions && session.branch?.name) {
    const branch = document.createElement('span');
    branch.className = 'topbar-meta';
    branch.textContent = session.branch.name;
    topbarActions.prepend(branch);
  }
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}
