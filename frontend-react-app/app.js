/* ========================================================
   App Configuration
   ======================================================== */

// Service URLs - configurable via env vars injected by nginx/docker
const CONFIG = {
  USER_SERVICE_URL: window.__ENV__?.USER_SERVICE_URL || 'http://localhost:3001',
  DASHBOARD_SERVICE_URL: window.__ENV__?.DASHBOARD_SERVICE_URL || 'http://localhost:3002',
  SETTINGS_SERVICE_URL: window.__ENV__?.SETTINGS_SERVICE_URL || 'http://localhost:3003',
};

/* ========================================================
   State Management
   ======================================================== */
let state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  currentColor: '#6366f1',
  dbWarningShown: false,
};

/* ========================================================
   Initialization
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
  if (state.token && state.user) {
    showDashboard();
  } else {
    showAuth();
  }
});

/* ========================================================
   Auth Functions
   ======================================================== */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`${tab}-form`).classList.add('active');

  // Clear messages
  hideMessages();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const btn = document.getElementById('login-btn');
  setButtonLoading(btn, true);
  hideMessages();

  try {
    const response = await fetch(`${CONFIG.USER_SERVICE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError('login-error', data.error || 'Login failed');
      return;
    }

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showDashboard();
  } catch (err) {
    console.error('Login error:', err);
    showError('login-error', 'Unable to connect to User Service. Please check if services are running.');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;

  if (password !== confirm) {
    showError('register-error', 'Passwords do not match');
    return;
  }

  const btn = document.getElementById('register-btn');
  setButtonLoading(btn, true);
  hideMessages();

  try {
    const response = await fetch(`${CONFIG.USER_SERVICE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError('register-error', data.error || 'Registration failed');
      return;
    }

    showSuccess('register-success', 'Account created successfully! You can now sign in.');
    document.getElementById('register-form').reset();

    // Auto-switch to login after 2 seconds
    setTimeout(() => switchAuthTab('login'), 2000);
  } catch (err) {
    console.error('Register error:', err);
    showError('register-error', 'Unable to connect to User Service. Please check if services are running.');
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showAuth();
}

/* ========================================================
   Page Navigation
   ======================================================== */
function showAuth() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('dashboard-page').classList.remove('active');
  hideMessages();
}

function showDashboard() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('dashboard-page').classList.add('active');

  // Update user info
  if (state.user) {
    document.getElementById('nav-user-email').textContent = state.user.email;
    document.getElementById('user-avatar').textContent = state.user.email.charAt(0).toUpperCase();
  }

  // Load initial data
  loadDashboardData();
  loadUserSettings();
  checkServiceHealth();
}

function switchView(view) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');

  if (view === 'dashboard') {
    loadDashboardData();
  }
}

/* ========================================================
   Dashboard Functions
   ======================================================== */
async function loadDashboardData() {
  try {
    const response = await fetch(`${CONFIG.DASHBOARD_SERVICE_URL}/api/dashboard/user-count`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('total-users').textContent = data.count;
      if (data.dbConnected === false) {
        showDbWarning();
      }
    } else if (response.status === 503) {
      document.getElementById('total-users').textContent = '—';
      showDbWarning();
    } else if (response.status === 401) {
      handleLogout();
    }
  } catch (err) {
    console.error('Dashboard error:', err);
    document.getElementById('total-users').textContent = '—';
    showDbWarning();
  }
}

async function checkServiceHealth() {
  const services = [
    { name: 'user', url: CONFIG.USER_SERVICE_URL },
    { name: 'dashboard', url: CONFIG.DASHBOARD_SERVICE_URL },
    { name: 'settings', url: CONFIG.SETTINGS_SERVICE_URL },
  ];

  let allHealthy = true;
  let anyDbDown = false;

  for (const service of services) {
    const statusEl = document.getElementById(`status-${service.name}`);
    const badgeEl = document.getElementById(`badge-${service.name}`);

    try {
      const response = await fetch(`${service.url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();

      statusEl.classList.add('online');
      statusEl.classList.remove('offline');
      badgeEl.textContent = 'Online';
      badgeEl.classList.add('online');
      badgeEl.classList.remove('offline');

      if (data.dbConnected === false) {
        anyDbDown = true;
      }
    } catch (err) {
      allHealthy = false;
      statusEl.classList.add('offline');
      statusEl.classList.remove('online');
      badgeEl.textContent = 'Offline';
      badgeEl.classList.add('offline');
      badgeEl.classList.remove('online');
    }
  }

  const healthEl = document.getElementById('system-health');
  healthEl.textContent = allHealthy ? 'Healthy' : 'Degraded';
  healthEl.style.color = allHealthy ? 'var(--success)' : 'var(--warning)';

  if (anyDbDown) {
    showDbWarning();
  }
}

/* ========================================================
   Settings Functions
   ======================================================== */
async function loadUserSettings() {
  try {
    const response = await fetch(`${CONFIG.SETTINGS_SERVICE_URL}/api/settings`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });

    const data = await response.json();

    if (response.ok && data.settings) {
      state.currentColor = data.settings.color;
      applyColor(data.settings.color);
      if (data.dbConnected === false) {
        showDbWarning();
      }
    }
  } catch (err) {
    console.error('Settings load error:', err);
  }
}

function selectColor(color) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return;

  state.currentColor = color;

  // Update UI
  document.getElementById('custom-color').value = color;
  document.getElementById('color-wheel').value = color;
  document.getElementById('preview-box').style.background = color;

  // Update active preset
  document.querySelectorAll('.color-preset').forEach(p => {
    p.classList.toggle('active', p.dataset.color === color);
  });
}

function applyColor(color) {
  document.documentElement.style.setProperty('--primary', color);

  // Calculate hover color (slightly darker)
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20);
  const hoverColor = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  document.documentElement.style.setProperty('--primary-hover', hoverColor);
  document.documentElement.style.setProperty('--primary-light', `${color}1a`);
  document.documentElement.style.setProperty('--primary-glow', `${color}4d`);
  document.documentElement.style.setProperty('--border-focus', color);

  selectColor(color);
}

async function saveColor() {
  const btn = document.getElementById('save-color-btn');
  setButtonLoading(btn, true);

  document.getElementById('settings-message').classList.add('hidden');
  document.getElementById('settings-error').classList.add('hidden');

  try {
    const response = await fetch(`${CONFIG.SETTINGS_SERVICE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      body: JSON.stringify({ color: state.currentColor }),
    });

    const data = await response.json();

    if (response.ok) {
      applyColor(state.currentColor);
      const msgEl = document.getElementById('settings-message');
      msgEl.textContent = '✓ Theme color saved successfully!';
      msgEl.classList.remove('hidden');
      setTimeout(() => msgEl.classList.add('hidden'), 3000);
    } else {
      const errEl = document.getElementById('settings-error');
      errEl.textContent = data.error || 'Failed to save settings';
      errEl.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Save settings error:', err);
    const errEl = document.getElementById('settings-error');
    errEl.textContent = 'Unable to connect to Settings Service';
    errEl.classList.remove('hidden');
  } finally {
    setButtonLoading(btn, false);
  }
}

/* ========================================================
   Utility Functions
   ======================================================== */
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.remove('hidden');
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideMessages() {
  document.querySelectorAll('.form-error, .form-success').forEach(el => {
    el.classList.add('hidden');
  });
}

function setButtonLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (loading) {
    text.style.opacity = '0';
    loader.classList.remove('hidden');
    btn.disabled = true;
  } else {
    text.style.opacity = '1';
    loader.classList.add('hidden');
    btn.disabled = false;
  }
}

function showDbWarning() {
  if (!state.dbWarningShown) {
    state.dbWarningShown = true;
    document.getElementById('db-warning').classList.remove('hidden');
  }
}
