import { api, getToken } from '../api/client.js';

if (!getToken()) {
  location.replace('login.html');
}

const grid = document.getElementById('plan-grid');
const status = document.getElementById('billing-status');
const currentPlanName = document.getElementById('current-plan-name');
const currentPlanStatus = document.getElementById('current-plan-status');

const PLAN_ORDER = ['STARTER', 'GROWTH', 'BUSINESS', 'SCALE'];

function setStatus(message, kind = '') {
  if (!status) return;

  status.textContent = message;
  status.className = `billing-status ${kind}`.trim();
}

function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
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
  const descriptions = {
    STARTER: 'For single-location businesses that want to stop guessing and start tracking.',
    GROWTH: 'For growing businesses with more products, staff and daily activity.',
    BUSINESS: 'For established businesses that need more capacity and operational control.',
    SCALE: 'For larger operations managing multiple locations and larger teams.',
  };

  return descriptions[key] || 'Built to help you run your business with better visibility.';
}

function getPlanBadge(key) {
  if (key === 'GROWTH') return 'Most popular';
  if (key === 'BUSINESS') return 'For growing teams';
  if (key === 'SCALE') return 'For larger operations';

  return '';
}

function getPlanFeatures(key, plan) {
  const common = [
    'POS & sales management',
    'Inventory management',
    'Sales history',
    'Receipts & invoices',
    'Business dashboard',
  ];

  const capacity = [
    `${plan.branches === 1 ? '1 branch' : `Up to ${plan.branches} branches`}`,
    `${Number(plan.products).toLocaleString('en-NG')} products`,
    `${plan.staff} staff ${plan.staff === 1 ? 'account' : 'accounts'}`,
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

  return `
    <article class="plan-card billing-plan-card ${isCurrent ? 'plan-current' : ''} ${key === 'GROWTH' ? 'plan-popular' : ''}">
      ${badge ? `<div class="plan-badge">${escapeHtml(badge)}</div>` : ''}

      <div class="plan-card-top">
        <div>
          <span class="eyebrow">${escapeHtml(plan.name)}</span>
          <h2>${formatNaira(plan.amountNaira)}<small>/month</small></h2>
        </div>

        ${isCurrent ? '<span class="current-plan-pill">Current</span>' : ''}
      </div>

      <p class="plan-description">
        ${escapeHtml(getPlanDescription(key))}
      </p>

      <div class="plan-capacity">
        <div>
          <strong>${plan.branches}</strong>
          <span>${plan.branches === 1 ? 'branch' : 'branches'}</span>
        </div>

        <div>
          <strong>${Number(plan.products).toLocaleString('en-NG')}</strong>
          <span>products</span>
        </div>

        <div>
          <strong>${plan.staff}</strong>
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
        data-plan="${key}"
        type="button"
        ${isActive ? '' : ''}
      >
        ${isActive ? 'Renew plan' : isCurrent ? 'Continue with plan' : 'Choose plan'}
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
        For businesses that need capacity beyond the standard Stocker plans.
      </p>

      <div class="plan-custom-summary">
        <div>
          <span>Built around you</span>
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

      <p class="plan-features-title">Custom plan can cover</p>

      <ul class="plan-features">
        <li>
          <span class="feature-check">✓</span>
          <span>Higher branch capacity</span>
        </li>

        <li>
          <span class="feature-check">✓</span>
          <span>Higher product capacity</span>
        </li>

        <li>
          <span class="feature-check">✓</span>
          <span>Larger staff teams</span>
        </li>

        <li>
          <span class="feature-check">✓</span>
          <span>Custom onboarding</span>
        </li>
      </ul>

      <button class="btn btn-secondary custom-plan-request" type="button">
        Request custom plan
      </button>
    </article>
  `;
}

function renderPlans(plans, current) {
  const orderedPlans = PLAN_ORDER
    .filter((key) => plans[key])
    .map((key) => [key, plans[key]]);

  grid.innerHTML = `
    ${orderedPlans
      .map(([key, plan]) => renderPlanCard(key, plan, current))
      .join('')}

    ${renderCustomCard()}
  `;

  attachPlanEvents();
}

function attachPlanEvents() {
  grid.querySelectorAll('.choose-plan').forEach((button) => {
    button.addEventListener('click', async () => {
      const plan = button.dataset.plan;

      button.disabled = true;
      button.classList.add('is-loading');

      setStatus('Preparing secure checkout…');

      try {
        const response = await api.post('/billing/initialize', {
          plan,
        });

        if (!response?.data?.authorizationUrl) {
          throw new Error('Payment checkout could not be created.');
        }

        location.href = response.data.authorizationUrl;
      } catch (error) {
        setStatus(
          error.message || 'Unable to start payment. Please try again.',
          'billing-error'
        );

        button.disabled = false;
        button.classList.remove('is-loading');
      }
    });
  });

  grid.querySelector('.custom-plan-request')?.addEventListener('click', async () => {
    const message = window.prompt(
      'Tell the Stocker team what your business needs:'
    );

    if (message === null) return;

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      setStatus('Please tell us what you need before sending the request.', 'billing-error');
      return;
    }

    const button = grid.querySelector('.custom-plan-request');

    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
    }

    try {
      await api.post('/billing/custom-request', {
        message: cleanMessage,
      });

      setStatus(
        'Your custom plan request was sent. The Stocker team will reply in your workspace.',
        'billing-success'
      );
    } catch (error) {
      setStatus(
        error.message || 'Unable to send your request. Please try again.',
        'billing-error'
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('is-loading');
      }
    }
  });
}

function renderCurrentPlan(current, plans) {
  if (!currentPlanName || !currentPlanStatus) return;

  const currentKey = current.plan || 'STARTER';
  const currentPlan = plans[currentKey];

  if (!currentPlan) {
    currentPlanName.textContent = 'Starter';
    currentPlanStatus.textContent = 'Trial';
    return;
  }

  currentPlanName.textContent = currentPlan.name;

  if (current.status === 'ACTIVE') {
    currentPlanStatus.textContent = 'Active';
  } else if (current.status === 'TRIAL') {
    currentPlanStatus.textContent = 'Free trial';
  } else if (current.status === 'PAUSED') {
    currentPlanStatus.textContent = 'Paused';
  } else {
    currentPlanStatus.textContent = current.status || 'Active';
  }
}

async function verifyPayment(reference) {
  setStatus('Confirming your payment…');

  try {
    const verified = await api.post('/billing/verify', {
      reference,
    });

    setStatus(
      verified?.data?.message || 'Payment confirmed successfully.',
      'billing-success'
    );

    return true;
  } catch (error) {
    setStatus(
      error.message || 'Payment confirmation is still pending. Please refresh shortly.',
      'billing-error'
    );

    return false;
  }
}

async function load() {
  try {
    const result = await api.get('/billing');

    const business = result.data?.business || {};
    const plans = result.data?.plans || {};
    const current = business.subscription || {};

    renderCurrentPlan(current, plans);

    const reference = new URLSearchParams(location.search).get('reference');

    if (reference) {
      await verifyPayment(reference);

      const cleanUrl = `${location.pathname}${location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!Object.keys(plans).length) {
      grid.innerHTML = `
        <div class="empty-state">
          No billing plans are currently available.
        </div>
      `;
      return;
    }

    renderPlans(plans, current);
  } catch (error) {
    setStatus(
      error.message || 'Unable to load billing information.',
      'billing-error'
    );

    grid.innerHTML = `
      <div class="empty-state">
        We couldn't load the available plans.
        <button class="btn btn-secondary" id="retry-billing" type="button">
          Try again
        </button>
      </div>
    `;

    document.getElementById('retry-billing')?.addEventListener('click', load);
  }
}

load();
