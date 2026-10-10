import { logout } from '../auth/guard.js';
import { api, getOfflineQueueCount } from '../api/client.js';

const NAV_ITEMS = [
  { href: 'index.html', label: 'Dashboard', icon: '01' },
  { href: 'sales.html', label: 'Point of sale', icon: '02' },
  { href: 'inventory.html', label: 'Inventory', icon: '03' },
];

function ensureFavicon() {
  let favicon = document.querySelector(
    'link[rel="icon"][type="image/svg+xml"]'
  );

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = 'favicon.svg';
    document.head.appendChild(favicon);
  }
}

function ensureMobileNavigationStyles() {
  if (document.querySelector('[data-stocker-mobile-nav-styles]')) {
    return;
  }

  const stylesheet = document.createElement('link');

  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'css/mobile-nav.css';
  stylesheet.dataset.stockerMobileNavStyles = 'true';

  document.head.appendChild(stylesheet);
}

function createNavLink(item, activeHref) {
  const link = document.createElement('a');
  const number = document.createElement('span');
  const label = document.createElement('span');

  link.href = item.href;

  if (item.href === activeHref) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }

  number.textContent = item.icon;
  number.setAttribute('aria-hidden', 'true');

  label.textContent = item.label;

  link.append(number, label);

  return link;
}

function setupMobileNavigation(sidebar, nav, menuButton) {
  if (!sidebar || !nav || !menuButton) {
    return;
  }

  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute(
      'aria-label',
      open ? 'Close navigation menu' : 'Open navigation menu'
    );

    sidebar.classList.toggle('mobile-menu-open', open);
  };

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';

    setMenuOpen(!isOpen);
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
    }
  });

  document.addEventListener('click', (event) => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';

    if (isOpen && !sidebar.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  const desktopQuery = window.matchMedia('(min-width: 900px)');

  const handleBreakpointChange = (event) => {
    if (event.matches) {
      setMenuOpen(false);
    }
  };

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener('change', handleBreakpointChange);
  } else {
    desktopQuery.addListener(handleBreakpointChange);
  }

  setMenuOpen(false);
}

function renderNavigation(sidebar, session, activeHref) {
  const header = document.createElement('div');
  header.className = 'sidebar-header';

  const brandGroup = document.createElement('div');
  brandGroup.className = 'sidebar-brand-group';

  const brand = document.createElement('a');
  brand.className = 'wordmark';
  brand.href = 'index.html';
  brand.textContent = 'stocker';
  brand.setAttribute('aria-label', 'Stocker dashboard');

  const caption = document.createElement('div');
  caption.className = 'sidebar-caption';
  caption.textContent = 'Retail operations';

  brandGroup.append(brand, caption);

  const menuButton = document.createElement('button');
  menuButton.className = 'mobile-menu-toggle';
  menuButton.type = 'button';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'workspace-nav');
  menuButton.setAttribute('aria-label', 'Open navigation menu');

  menuButton.innerHTML = `
    <svg
      class="menu-icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
    >
      <path
        class="menu-icon-top"
        d="M4 7h16"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        class="menu-icon-middle"
        d="M4 12h16"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        class="menu-icon-bottom"
        d="M4 17h16"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </svg>
  `;

  header.append(brandGroup, menuButton);

  const kicker = document.createElement('div');
  kicker.className = 'nav-kicker';
  kicker.textContent = 'Workspace';

  const nav = document.createElement('nav');
  nav.id = 'workspace-nav';
  nav.setAttribute('aria-label', 'Main navigation');

  NAV_ITEMS.forEach((item) => {
    nav.appendChild(createNavLink(item, activeHref));
  });

  if (session.permissions.includes('settings.manage')) {
    nav.appendChild(
      createNavLink(
        { href: 'admin.html', label: 'Settings', icon: '04' },
        activeHref
      )
    );
  }

  nav.appendChild(
    createNavLink(
      { href: 'feedback.html', label: 'Help & feedback', icon: '05' },
      activeHref
    )
  );

  if (session.permissions.includes('sales.view')) {
    nav.appendChild(
      createNavLink(
        { href: 'invoices.html', label: 'Invoices', icon: '06' },
        activeHref
      )
    );
  }

  if (session.permissions.includes('staff.view')) {
    nav.appendChild(
      createNavLink(
        { href: 'staff.html', label: 'Staff', icon: '07' },
        activeHref
      )
    );
  }

  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';

  const businessType = session.business?.type || 'Business';
  const branchName = session.branch?.name || 'All assigned locations';

  footer.textContent = `${businessType} · ${branchName}`;

  sidebar.replaceChildren(header, kicker, nav, footer);

  setupMobileNavigation(sidebar, nav, menuButton);
}

function renderConnectionBanner() {
  const mainContent = document.querySelector('.main-content');

  if (!mainContent) {
    return;
  }

  let connectionBanner = mainContent.querySelector('.connection-banner');

  if (!connectionBanner) {
    connectionBanner = document.createElement('div');
    connectionBanner.className = 'connection-banner';
    connectionBanner.setAttribute('role', 'status');

    mainContent.prepend(connectionBanner);
  }

  const updateConnection = async () => {
    const pending = await getOfflineQueueCount().catch(() => 0);

    connectionBanner.textContent = navigator.onLine
      ? (
          pending
            ? `${pending} activity item${pending === 1 ? '' : 's'} syncing…`
            : ''
        )
      : 'You are offline. Sales and stock changes will sync when your connection returns.';

    connectionBanner.classList.toggle(
      'is-visible',
      !navigator.onLine || pending > 0
    );

    connectionBanner.classList.toggle(
      'is-offline',
      !navigator.onLine
    );
  };

  if (connectionBanner.dataset.listenersAttached !== 'true') {
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    window.addEventListener('stocker:sync-status', updateConnection);

    connectionBanner.dataset.listenersAttached = 'true';
  }

  updateConnection();
}

function renderSubscriptionBanner(session) {
  if (!session.subscription) {
    return;
  }

  const mainContent = document.querySelector('.main-content');

  if (!mainContent || mainContent.querySelector('.subscription-banner')) {
    return;
  }

  const subscription = session.subscription;

  const endsAt = subscription.status === 'TRIAL'
    ? subscription.trialEndsAt
    : subscription.accessEndsAt;

  const days = endsAt
    ? Math.max(
        0,
        Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000)
      )
    : null;

  const banner = document.createElement('div');

  banner.className = [
    'subscription-banner',
    days !== null && days <= 2 ? 'subscription-urgent' : '',
  ].filter(Boolean).join(' ');

  const status = document.createElement('span');
  const statusLabel = document.createElement('strong');

  statusLabel.textContent = subscription.status === 'TRIAL'
    ? 'Free trial:'
    : `${subscription.plan}:`;

  const remaining = days === null
    ? 'Access active'
    : `${days} day${days === 1 ? '' : 's'} remaining`;

  status.append(statusLabel, document.createTextNode(` ${remaining}`));

  const description = document.createElement('span');

  description.appendChild(
    document.createTextNode(
      subscription.status === 'TRIAL'
        ? 'Choose a plan before access pauses. '
        : 'Your workspace is active. '
    )
  );

  const billingLink = document.createElement('a');
  billingLink.href = 'billing.html';
  billingLink.textContent = 'Manage billing';

  description.appendChild(billingLink);

  banner.append(status, description);
  mainContent.prepend(banner);
}

function renderNotifications(topbarActions) {
  if (!topbarActions || topbarActions.querySelector('.notification-bell')) {
    return;
  }

  const notificationButton = document.createElement('button');

  notificationButton.className = 'notification-bell';
  notificationButton.type = 'button';
  notificationButton.setAttribute('aria-label', 'Notifications');

  notificationButton.innerHTML = `
    <span aria-hidden="true">!</span>
    <b class="notification-count is-empty">0</b>
  `;

  notificationButton.addEventListener('click', () => {
    const panel = document.querySelector('.notification-panel');

    if (panel) {
      panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });

  topbarActions.prepend(notificationButton);

  api.get('/notifications')
    .then((result) => {
      const notifications = Array.isArray(result.data)
        ? result.data
        : [];

      const unread = notifications.filter((item) => !item.readAt);

      const count = notificationButton.querySelector('.notification-count');

      count.textContent = unread.length > 99
        ? '99+'
        : String(unread.length);

      count.classList.toggle('is-empty', unread.length === 0);

      unread.slice(0, 3).forEach((item, index) => {
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.className = 'attention-toast';

          const title = document.createElement('strong');
          const message = document.createElement('span');

          title.textContent = item.title || 'Notification';
          message.textContent = item.message || '';

          toast.append(title, message);
          document.body.appendChild(toast);

          setTimeout(() => toast.remove(), 6500);
        }, index * 250);
      });
    })
    .catch(() => {
      // Notifications should not prevent the rest of the page from loading.
    });
}

export function renderShell(session, activeHref) {
  ensureFavicon();
  ensureMobileNavigationStyles();

  const sidebar = document.getElementById('sidebar');
  const topbarBusiness = document.getElementById('topbar-business');
  const topbarUser = document.getElementById('topbar-user');
  const logoutBtn = document.getElementById('logout-btn');
  const topbarActions = document.querySelector('.topbar-actions');

  if (sidebar && session) {
    renderNavigation(sidebar, session, activeHref);
  }

  if (topbarBusiness) {
    topbarBusiness.textContent = session?.business?.name || 'Your business';
  }

  if (topbarUser) {
    const fullName = session?.user?.fullName || '';
    const role = session?.role || '';

    topbarUser.textContent = [fullName, role].filter(Boolean).join(' · ');
  }

  renderConnectionBanner();
  renderSubscriptionBanner(session);
  renderNotifications(topbarActions);

  if (logoutBtn && logoutBtn.dataset.logoutAttached !== 'true') {
    logoutBtn.addEventListener('click', logout);
    logoutBtn.dataset.logoutAttached = 'true';
  }

  if (topbarActions && session?.branch?.name) {
    let branch = topbarActions.querySelector('.topbar-branch');

    if (!branch) {
      branch = document.createElement('span');
      branch.className = 'topbar-meta topbar-branch';
      topbarActions.prepend(branch);
    }

    branch.textContent = session.branch.name;
  }
}
