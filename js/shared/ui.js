// js/shared/ui.js — reusable notification/loading helpers, no framework.

export function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Prevents double-submission and shows in-flight state on a button.
export async function withButtonLoading(button, labelWhileLoading, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = labelWhileLoading;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

export function emptyState(container, { title, message, actionLabel, onAction }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  wrap.innerHTML = `<h3>${title}</h3><p>${message}</p>`;
  if (actionLabel) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = actionLabel;
    btn.addEventListener('click', onAction);
    wrap.appendChild(btn);
  }
  container.appendChild(wrap);
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

export function formatMoney(minorUnits, currency = 'NGN') {
  const amount = (minorUnits || 0) / 100;
  const symbol = currency === 'NGN' ? '₦' : currency + ' ';
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}
