import { api, getToken } from '../api/client.js';

if (!getToken()) location.replace('login.html');
const grid = document.getElementById('plan-grid');
const status = document.getElementById('billing-status');

function setStatus(message, kind = '') { status.textContent = message; status.className = `billing-status ${kind}`; }

async function load() {
  try {
    const result = await api.get('/billing');
    const { business, plans } = result.data;
    const current = business.subscription || {};
    const reference = new URLSearchParams(location.search).get('reference');
    if (reference) {
      setStatus('Confirming your payment…');
      const verified = await api.post('/billing/verify', { reference });
      setStatus(verified.data.message, 'billing-success');
    }
    grid.innerHTML = `${Object.entries(plans).map(([key, plan]) => `<article class="plan-card ${current.plan === key ? 'plan-current' : ''}"><span class="eyebrow">${plan.name}</span><h2>₦${plan.amountNaira.toLocaleString()}<small>/month</small></h2><p>${key === 'STARTER' ? 'For lean shops getting their core operations under control.' : 'For growing teams with more branches, products, and staff.'}</p><ul><li>${key === 'STARTER' ? '1 branch' : 'Up to 5 branches'}</li><li>${key === 'STARTER' ? '500 products' : '5,000 products'}</li><li>${key === 'STARTER' ? '3 staff accounts' : '25 staff accounts'}</li></ul><button class="btn btn-primary choose-plan" data-plan="${key}" type="button">${current.plan === key && current.status === 'ACTIVE' ? 'Renew plan' : 'Choose plan'}</button></article>`).join('')}<article class="plan-card plan-custom"><span class="eyebrow">Custom</span><h2>Let’s talk</h2><p>For larger multi-location operations, wholesale, and distribution teams.</p><ul><li>Flexible limits</li><li>Custom onboarding</li><li>Reply directly from the platform team</li></ul><button class="btn btn-secondary custom-plan-request" type="button">Request custom plan</button></article>`;
    grid.querySelectorAll('.choose-plan').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try { const response = await api.post('/billing/initialize', { plan: button.dataset.plan }); location.href = response.data.authorizationUrl; } catch (error) { setStatus(error.message, 'billing-error'); button.disabled = false; }
    }));
    grid.querySelector('.custom-plan-request')?.addEventListener('click', async () => {
      const message = window.prompt('Tell the platform team what your business needs:');
      if (message === null) return;
      try { await api.post('/billing/custom-request', { message }); setStatus('Your custom plan request was sent. The platform team will reply in your workspace.', 'billing-success'); } catch (error) { setStatus(error.message, 'billing-error'); }
    });
  } catch (error) { setStatus(error.message, 'billing-error'); }
}

load();