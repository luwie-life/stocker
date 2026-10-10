import { api, getToken } from '../api/client.js';

if (!getToken()) {
  location.replace('login.html');
}

const grid = document.getElementById('plan-grid');
const status = document.getElementById('billing-status');
const currentPlanName = document.getElementById('current-plan-name');
const currentPlanStatus = document.getElementById('current-plan-status');

const PLAN_ORDER = ['STARTER', 'GROWTH', 'BUSINESS', 'SCALE'];

const PLAN_DESCRIPTIONS = {
  STARTER:
    'For single-location businesses ready to track sales and inventory more reliably.',
  GROWTH:
    'For growing businesses managing more products, staff, and daily activity.',
  BUSINESS:
    'For established businesses that need greater capacity and operational control.',
  SCALE:
    'For larger operations managing multiple locations and larger teams.',
};

const PLAN_BADGES = {
  GROWTH: 'Most popular',
  BUSINESS: 'For growing teams',
  SCALE: 'For larger operations',
};

function setStatus(message, kind = '') {
  if (!status) return;

  status.textContent = message;
  status.className = `billing-status ${kind}`.trim();
}

function setGridLoading(isLoading) {
  if (!grid) return;

  grid.setAttribute('aria-busy', String(isLoading));
}

function formatNaira(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value < 0) {
    return 'Price unavailable';
  }

  return `₦${value.toLocaleString('en-NG', {
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return '—';
  }

  return number.toLocaleString('en-NG');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getPlanDescription(key) {
  return PLAN_DESCRIPTIONS[key] ||
    'Designed to help you manage your business with better visibility.';
}

function getPlanBadge(key) {
  return PLAN_BADGES[key] || '';
}

function getPlanFeatures(key, plan) {
  const common = [
    'Point of sale and sales management',
    'Inventory management',
    'Sales history',
    'Receipts and invoices',
    'Business dashboard',
  ];

  const branches = Number(plan.branches);
  const products = Number(plan.products);
  const staff = Number(plan.staff);

  const capacity = [
    `${branches === 1 ? '1 branch' : `Up to ${formatNumber(branches)} branches`}`,
    `${formatNumber(products)} products`,
    `${formatNumber(staff)} staff ${staff === 1 ? 'account' : 'accounts'}`,
  ];

  if (key === 'STARTER') {
    return [
      ...common,
      ...capacity,
      'Essential sales insights',
    ];
  }

  if (key === 'GROWTH') {
    return [
      ...common,
      ...capacity,
      'Multi-branch management',
      'Staff management',
      'Attendance tracking',
      'Advanced business insights',
    ];
  }

  if (key === 'BUSINESS') {
    return [
      ...common,
      ...capacity,
      'Multi-branch management',
      'Staff management',
      'Attendance tracking',
      'Advanced business insights',
      'Higher operational capacity',
      'Priority support',
    ];
  }

  return [
    ...common,
    ...capacity,
    'Multi-location management',
    'Staff management',
    'Attendance tracking',
    'Advanced business insights',
    'Higher operational capacity',
    'Priority onboarding',
    'Priority support',
  ];
}

function renderPlanCard(key, plan, current) {
  const isCurrent = current.plan === key;
  const isActive = isCurrent && current.status === 'ACTIVE';
  const badge = getPlanBadge(key);
  const features = getPlanFeatures(key, plan);

  const amount = formatNaira(plan.amountNaira);
  const planName = escapeHtml(plan.name || key);

  let buttonLabel = 'Choose plan';

  if (isActive) {
    buttonLabel = 'Renew plan';
  } else if (isCurrent) {
    buttonLabel = 'Continue with plan';
  }

  return `
    <article
      class="plan-card billing-plan-card
        ${isCurrent ? 'plan-current' : ''}
        ${key === 'GROWTH' ? 'plan-popular' : ''}"
      aria-label="${planName} subscription plan"
    >
      ${
        badge
          ? `<div class="plan-badge">${escapeHtml(badge)}</div>`
          : ''
      }

      <div class="plan-card-top">
        <div>
          <span class="eyebrow">${planName}</span>
          <h2>
            ${amount}
            <small>/month</small>
          </h2>
        </div>

        ${
          isCurrent
            ? '<span class="current-plan-pill">Current</span>'
            : ''
        }
      </div>

      <p class="plan-description">
        ${escapeHtml(getPlanDescription(key))}
      </p>

      <div class="plan-capacity" aria-label="Plan limits">
        <div>
          <strong>${formatNumber(plan.branches)}</strong>
          <span>${Number(plan.branches) === 1 ? 'branch' : 'branches'}</span>
        </div>

        <div>
          <strong>${formatNumber(plan.products)}</strong>
          <span>products</span>
        </div>

        <div>
          <strong>${formatNumber(plan.staff)}</strong>
          <span>staff</span>
        </div>
      </div>

      <div class="plan-divider"></div>

      <p class="plan-features-title">What's included</p>

      <ul class="plan-features">
        ${features.map((feature) => `
          <li>
            <span class="feature-check" aria-hidden="true">✓</span>
            <span>${escapeHtml(feature)}</span>
          </li>
        `).join('')}
      </ul>

      <button
        class="btn ${key === 'GROWTH' ? 'btn-primary' : 'btn-secondary'} choose-plan"
        data-plan="${escapeHtml(key)}"
        type="button"
        aria-label="${buttonLabel}: ${planName}"
      >
        ${buttonLabel}
      </button>
    </article>
  `;
}

function renderCustomCard() {
  return `
    <article class="plan-card billing-plan-card plan-custom">
      <div class="plan-card-top">
        <div>
          <span class="eyebrow">Custom</span>
          <h2>Let's talk</h2>
        </div>
      </div>

      <p class="plan-description">
        For businesses that need more capacity than the standard plans offer.
      </p>

      <div class="plan-custom-summary">
        <div>
          <span>Capacity</span>
          <strong>Flexible limits</strong>
        </div>

        <div>
          <span>Support</span>
          <strong>Custom onboarding</strong>
        </div>

        <div>
          <span>Best for</span>
          <strong>Larger operations</strong>
        </div>
      </div>

      <div class="plan-divider"></div>

      <p class="plan-features-title">A custom plan can include</p>

      <ul class="plan-features">
        <li>
          <span class="feature-check" aria-hidden="true">✓</span>
          <span>Higher branch capacity</span>
        </li>

        <li>
          <span class="feature-check" aria-hidden="true">✓</span>
          <span>Higher product capacity</span>
        </li>

        <li>
          <span class="feature-check" aria-hidden="true">✓</span>
          <span>Larger staff teams</span>
        </li>

        <li>
          <span class="feature-check" aria-hidden="true">✓</span>
          <span>Custom onboarding</span>
        </li>
      </ul>

      <button
        class="btn btn-secondary custom-plan-request"
        type="button"
      >
        Request custom plan
      </button>
    </article>
  `;
}

function renderPlans(plans, current) {
  if (!grid) return;

  const orderedPlans = PLAN_ORDER
    .filter((key) => plans[key])
    .map((key) => [key, plans[key]]);

  if (!orderedPlans.length) {
    grid.innerHTML = `
      <div class="billing-loading">
        No subscription plans are available right now.
        Please check again later.
      </div>
    `;

    setGridLoading(false);
    return;
  }

  grid.innerHTML = `
    ${orderedPlans
      .map(([key, plan]) => renderPlanCard(key, plan, current))
      .join('')}

    ${renderCustomCard()}
  `;

  setGridLoading(false);
  attachPlanEvents();
}

function setButtonLoading(button, loading, loadingText = 'Please wait…') {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent.trim();
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    delete button.dataset.originalText;
  }
}

function attachPlanEvents() {
  if (!grid) return;

  grid.querySelectorAll('.choose-plan').forEach((button) => {
    button.addEventListener('click', async () => {
      const plan = button.dataset.plan;

      if (!plan) {
        setStatus('Please select a valid subscription plan.', 'billing-error');
        return;
      }

      setButtonLoading(button, true, 'Preparing checkout…');
      setStatus('Preparing secure checkout…');

      try {
        const response = await api.post('/billing/initialize', { plan });
        const authorizationUrl = response?.data?.authorizationUrl;

        if (!authorizationUrl) {
          throw new Error(
            'Checkout could not be created. Please try again.'
          );
        }

        let checkoutUrl;

        try {
          checkoutUrl = new URL(authorizationUrl);
        } catch {
          throw new Error('The payment provider returned an invalid checkout link.');
        }

        if (checkoutUrl.protocol !== 'https:') {
          throw new Error('The checkout link is not secure. Please contact support.');
        }

        location.assign(checkoutUrl.href);
      } catch (error) {
        setStatus(
          error.message || 'Unable to start payment. Please try again.',
          'billing-error'
        );

        setButtonLoading(button, false);
      }
    });
  });

  grid.querySelector('.custom-plan-request')
    ?.addEventListener('click', async (event) => {
      const button = event.currentTarget;

      const message = window.prompt(
        'Tell the Stocker team about your business and what you need from a custom plan.'
      );

      if (message === null) return;

      const cleanMessage = message.trim();

      if (!cleanMessage) {
        setStatus(
          'Please describe what your business needs before sending the request.',
          'billing-error'
        );
        return;
      }

      if (cleanMessage.length < 10) {
        setStatus(
          'Please provide a little more detail so the team can understand your requirements.',
          'billing-error'
        );
        return;
      }

      if (cleanMessage.length > 2000) {
        setStatus(
          'Your request is too long. Please keep it under 2,000 characters.',
          'billing-error'
        );
        return;
      }

      setButtonLoading(button, true, 'Sending request…');
      setStatus('Sending your custom plan request…');

      try {
        await api.post('/billing/custom-request', {
          message: cleanMessage,
        });

        setStatus(
          'Your custom plan request was sent successfully.',
          'billing-success'
        );
      } catch (error) {
        setStatus(
          error.message || 'Unable to send your request. Please try again.',
          'billing-error'
        );
      } finally {
        setButtonLoading(button, false);
      }
    });
}

function renderCurrentPlan(current, plans) {
  if (!currentPlanName || !currentPlanStatus) return;

  const currentKey = current.plan || 'STARTER';
  const plan = plans[currentKey];

  if (!plan) {
    currentPlanName.textContent = 'Plan information unavailable';
    currentPlanStatus.textContent = 'Unknown';
    return;
  }

  currentPlanName.textContent = plan.name || currentKey;

  const labels = {
    ACTIVE: 'Active',
    TRIAL: 'Free trial',
    PAUSED: 'Paused',
    PENDING: 'Pending',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    INACTIVE: 'Inactive',
  };

  currentPlanStatus.textContent =
    labels[current.status] || current.status || 'Status unavailable';
}

async function verifyPayment(reference) {
  setStatus('Confirming your payment. Please wait…');

  try {
    const result = await api.post('/billing/verify', { reference });

    setStatus(
      result?.data?.message || 'Payment confirmation received.',
      'billing-success'
    );

    return true;
  } catch (error) {
    setStatus(
      error.message ||
        'We could not confirm the payment yet. Please refresh this page shortly before trying to pay again.',
      'billing-error'
    );

    return false;
  }
}

function removePaymentReferenceFromUrl() {
  const url = new URL(window.location.href);

  url.searchParams.delete('reference');
  url.searchParams.delete('trxref');

  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`
  );
}

async function load() {
  if (!grid) return;

  setGridLoading(true);
  grid.innerHTML = `
    <div class="billing-loading">
      Loading available plans…
    </div>
  `;

  try {
    const result = await api.get('/billing');

    const data = result?.data || {};
    const business = data.business || {};
    const plans = data.plans || {};
    const current = business.subscription || {};

    renderCurrentPlan(current, plans);

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (reference) {
      await verifyPayment(reference);
      removePaymentReferenceFromUrl();
    }

    renderPlans(plans, current);
  } catch (error) {
    setGridLoading(false);

    setStatus(
      error.message || 'Unable to load your billing information.',
      'billing-error'
    );

    grid.innerHTML = `
      <div class="billing-loading">
        <p>We couldn't load your subscription plans.</p>
        <p>Please check your connection and try again.</p>
        <button
          class="btn btn-secondary"
          id="retry-billing"
          type="button"
        >
          Try again
        </button>
      </div>
    `;

    document.getElementById('retry-billing')
      ?.addEventListener('click', load);
  }
}

load();
