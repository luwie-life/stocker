import { api, setSession, isLoggedIn } from '../api/client.js';
import { showToast, withButtonLoading } from '../shared/ui.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const referralCode = new URLSearchParams(location.search).get('ref');

async function redirectIfSessionIsValid() {
  if (!isLoggedIn()) return;

  try {
    const res = await api.get('/auth/session');

    if (res.data.isPlatformAdmin) {
      location.replace('platform-admin.html');
      return;
    }

    if (res.data.isAmbassador) {
      location.replace('ambassador.html');
      return;
    }

    location.replace('index.html');
  } catch {
    // The API client clears invalid sessions.
    // Keep the auth form visible.
  }
}

redirectIfSessionIsValid();
const accountTypeSelect = document.getElementById('reg-accountType');
const businessFields = document.getElementById('business-fields');
const ambassadorFields = document.getElementById('ambassador-fields');

function syncAccountTypeFields() {
  const isAmbassador = accountTypeSelect.value === 'AMBASSADOR';
  businessFields.style.display = isAmbassador ? 'none' : 'block';
  ambassadorFields.style.display = isAmbassador ? 'block' : 'none';

  const businessNameInput = document.getElementById('reg-businessName');
  const businessTypeInput = document.getElementById('reg-businessType');
  if (isAmbassador) {
    businessNameInput.required = false;
    businessTypeInput.required = false;
  } else {
    businessNameInput.required = true;
    businessTypeInput.required = true;
  }
}

accountTypeSelect.addEventListener('change', syncAccountTypeFields);
syncAccountTypeFields();

function showLogin() {
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  tabLogin.classList.replace('btn-secondary', 'btn-primary');
  tabRegister.classList.replace('btn-primary', 'btn-secondary');
}
function showRegister() {
  registerForm.style.display = 'block';
  loginForm.style.display = 'none';
  tabRegister.classList.replace('btn-secondary', 'btn-primary');
  tabLogin.classList.replace('btn-primary', 'btn-secondary');
}
tabLogin.addEventListener('click', showLogin);
tabRegister.addEventListener('click', showRegister);
if (location.hash === '#register') showRegister();
else showLogin();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  await withButtonLoading(btn, 'Signing in…', async () => {
    try {
      const res = await api.post('/auth/login', {
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value,
      });
      setSession(res.data.token);
      if (res.data.isPlatformAdmin) {
        location.href = 'platform-admin.html';
      } else if (res.data.isAmbassador) {
        location.href = 'ambassador.html';
      } else {
        location.href = 'index.html';
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const accountType = accountTypeSelect.value;
  await withButtonLoading(btn, accountType === 'AMBASSADOR' ? 'Submitting ambassador application…' : 'Creating your business…', async () => {
    try {
      const payload = {
        accountType,
        fullName: document.getElementById('reg-fullName').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        phone: document.getElementById('reg-phone').value.trim(),
        ...(accountType === 'BUSINESS' ? {
          businessName: document.getElementById('reg-businessName').value.trim(),
          businessType: document.getElementById('reg-businessType').value,
        } : {
          ambassadorApplication: {
            phone: document.getElementById('reg-phone').value.trim(),
            location: document.getElementById('amb-location').value.trim(),
            experience: document.getElementById('amb-experience').value.trim(),
            audience: document.getElementById('amb-audience').value.trim(),
            note: document.getElementById('amb-note').value.trim(),
          },
        }),
        ...(referralCode || document.getElementById('reg-referralCode').value.trim() ? { referralCode: referralCode || document.getElementById('reg-referralCode').value.trim() } : {}),
      };

      const res = await api.post('/auth/register', payload);
      setSession(res.data.token);
      if (accountType === 'AMBASSADOR') {
        showToast('Your ambassador application has been submitted for review.', 'success');
        location.href = 'login.html';
      } else {
        showToast('Business created. Welcome to stocker!', 'success');
        location.href = 'index.html';
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
