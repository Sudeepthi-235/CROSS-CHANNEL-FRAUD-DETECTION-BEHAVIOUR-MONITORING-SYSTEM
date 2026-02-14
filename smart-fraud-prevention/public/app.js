// ============================================================
// app.js — Shared utilities, sidebar, helpers
// ============================================================

function getUser() {
  const raw = localStorage.getItem('sfp_user');
  return raw ? JSON.parse(raw) : null;
}
function saveUser(user) {
  localStorage.setItem('sfp_user', JSON.stringify(user));
}
function requireAuth() {
  if (!getUser()) { window.location.href = 'login.html'; return false; }
  return true;
}
function logout() {
  ['sfp_user','sfp_device','sfp_new_device','sfp_pending_txn'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'login.html';
}
function getDeviceId() {
  return localStorage.getItem('sfp_device') || detectDevice();
}
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'Safari / iPhone';
  if (/iPad/.test(ua)) return 'Safari / iPad';
  if (/Android.*Chrome/.test(ua)) return 'Chrome / Android';
  if (/Chrome/.test(ua)) return 'Chrome / Windows';
  if (/Firefox/.test(ua)) return 'Firefox / Desktop';
  if (/Safari/.test(ua)) return 'Safari / Mac';
  if (/Edge/.test(ua)) return 'Edge / Windows';
  return 'Unknown Browser';
}

// ---- Toast (center of screen) ----
let _toastCont = null;
function showToast(message, type = 'info', duration = 3800) {
  if (!_toastCont) {
    _toastCont = document.createElement('div');
    _toastCont.className = 'toast-container';
    document.body.appendChild(_toastCont);
  }
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="font-size:1.1rem">${icons[type]||'ℹ️'}</span><span style="flex:1">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  _toastCont.appendChild(t);
  setTimeout(() => { if(t.parentElement){t.style.opacity='0';t.style.transform='scale(0.85)';t.style.transition='all 0.3s ease';setTimeout(()=>t.remove(),300);} }, duration);
}

// ---- Sidebar ----
async function renderSidebar(activePage) {
  const user = getUser();
  if (!user) return;
  let alertCount = 0;
  try {
    const r = await fetch(`/alerts?userId=${user.id}`);
    const a = await r.json();
    alertCount = a.filter(x => !x.read).length;
  } catch(e){}

  const initials = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const acctMask = user.accountNumber.replace(/^(\d{4}-\d{4}-\d{4}-)(\d{4})$/, '****-****-****-$2');

  const nav = [
    { id:'dashboard', icon:'📊', label:'Dashboard', href:'dashboard.html' },
    { id:'transactions', icon:'💳', label:'Transactions', href:'transactions.html' },
    { id:'alerts', icon:'🔔', label:'Alerts', href:'alerts.html', badge: alertCount },
  ];

  const mount = document.getElementById('sidebar-mount');
  if (!mount) return;
  mount.innerHTML = `
  <aside class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">🛡️</div>
      <div class="logo-text"><h2>SecureBank</h2><span>Fraud Prevention</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Menu</div>
      ${nav.map(n=>`
        <a href="${n.href}" class="nav-item ${activePage===n.id?'active':''}">
          <span class="nav-icon">${n.icon}</span> ${n.label}
          ${n.badge>0?`<span class="nav-badge">${n.badge}</span>`:''}
        </a>
      `).join('')}
      <div class="nav-section-label" style="margin-top:10px">Account</div>
      <div class="nav-item" onclick="openSettings()">
        <span class="nav-icon">⚙️</span> Settings
      </div>
      <div class="nav-item" onclick="openReport()">
        <span class="nav-icon">📢</span> Report Issue
      </div>
    </nav>
    <!-- User bottom -->
    <div class="sidebar-user">
      <div class="user-dropdown" id="user-dropdown">
        <div class="dropdown-profile-header">
          <div class="dp-name">${user.name}</div>
          <div class="dp-acct">${user.accountNumber}</div>
          <span class="dp-badge">✔ Active Account</span>
        </div>
        <div class="dropdown-detail">
          <div class="dropdown-detail-row"><span class="dr-label">Email</span><span class="dr-value">${user.email||'—'}</span></div>
          <div class="dropdown-detail-row"><span class="dr-label">Phone</span><span class="dr-value">${user.phone||'—'}</span></div>
          <div class="dropdown-detail-row"><span class="dr-label">Member since</span><span class="dr-value">${user.joinDate||'—'}</span></div>
          <div class="dropdown-detail-row"><span class="dr-label">Device</span><span class="dr-value" style="font-size:0.72rem">${getDeviceId()}</span></div>
        </div>
        <div class="dropdown-action" onclick="openSettings();document.getElementById('user-dropdown').classList.remove('open')"><span class="da-icon">⚙️</span> Edit Profile</div>
        <div class="dropdown-action" onclick="openReport();document.getElementById('user-dropdown').classList.remove('open')"><span class="da-icon">📢</span> Report Issue</div>
        <div class="dropdown-action logout" onclick="logout()"><span class="da-icon">🚪</span> Logout</div>
      </div>
      <div class="sidebar-user-inner" onclick="toggleUserDropdown()">
        <div class="user-avatar">${initials}</div>
        <div class="user-info" style="flex:1;min-width:0">
          <div class="user-name">${user.name}</div>
          <div class="user-acct">${acctMask}</div>
        </div>
        <span class="user-chevron">▲</span>
      </div>
    </div>
  </aside>

  <!-- ===== SETTINGS MODAL ===== -->
  <div class="modal-overlay" id="settings-modal">
    <div class="modal" style="max-width:420px">
      <h2 style="margin-bottom:6px">⚙️ Settings</h2>
      <p class="modal-sub">Update your account information</p>
      <div class="settings-tabs" id="settings-tabs">
        <button class="settings-tab active" onclick="switchSettingsTab('profile')">Profile</button>
        <button class="settings-tab" onclick="switchSettingsTab('security')">Security</button>
      </div>
      <!-- Profile tab -->
      <div class="settings-panel active" id="stab-profile">
        <div class="form-group mb-3"><label>Full Name</label><input type="text" id="set-name" value="${user.name}" /></div>
        <div class="form-group mb-3"><label>Email</label><input type="email" id="set-email" value="${user.email||''}" /></div>
        <div class="form-group mb-3"><label>Phone</label><input type="text" id="set-phone" value="${user.phone||''}" /></div>
        <div class="form-group mb-3"><label>Bank Account Number (read-only)</label><input type="text" value="${user.accountNumber}" disabled style="opacity:0.6;cursor:not-allowed" /></div>
      </div>
      <!-- Security tab -->
      <div class="settings-panel" id="stab-security">
        <div class="form-group mb-3"><label>New Password</label><input type="password" id="set-pass" placeholder="Leave blank to keep current" /></div>
        <div class="form-group mb-3"><label>Confirm Password</label><input type="password" id="set-pass2" placeholder="Re-enter new password" /></div>
        <div style="background:var(--info-bg);border-radius:8px;padding:10px 12px;font-size:0.78rem;color:var(--info);margin-top:4px">
          🛡️ Changing password will take effect on your next login.
        </div>
      </div>
      <div id="settings-msg" style="display:none;margin-bottom:10px"></div>
      <div class="modal-actions mt-4">
        <button class="btn btn-secondary" onclick="closeSettings()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSettings()">💾 Save Changes</button>
      </div>
    </div>
  </div>

  <!-- ===== REPORT MODAL ===== -->
  <div class="modal-overlay" id="report-modal">
    <div class="modal" style="max-width:400px">
      <div class="modal-icon warning">📢</div>
      <h2>Report a Problem</h2>
      <p class="modal-sub">Contact our fraud prevention team immediately</p>
      <div class="contact-option" onclick="window.open('mailto:fraud@securebank.com?subject=Fraud Report')">
        <span class="co-icon">📧</span>
        <div><div class="co-label">Email (24/7)</div><div class="co-value">fraud@securebank.com</div></div>
        <span style="margin-left:auto;color:var(--primary);font-size:0.8rem">→</span>
      </div>
      <div class="contact-option" onclick="window.open('tel:18001234567')">
        <span class="co-icon">📞</span>
        <div><div class="co-label">Helpline (24/7 Toll-Free)</div><div class="co-value">1800-123-4567</div></div>
        <span style="margin-left:auto;color:var(--primary);font-size:0.8rem">→</span>
      </div>
      <div class="contact-option" onclick="window.open('https://securebank.com/report','_blank')">
        <span class="co-icon">🌐</span>
        <div><div class="co-label">Online Portal</div><div class="co-value">securebank.com/report</div></div>
        <span style="margin-left:auto;color:var(--primary);font-size:0.8rem">→</span>
      </div>
      <div style="margin-top:14px">
        <div class="form-group mb-3">
          <label>Describe the issue (optional)</label>
          <textarea id="report-desc" rows="3" placeholder="e.g. I received a transaction I did not authorise…"></textarea>
        </div>
        <div id="report-ref" style="display:none;background:var(--success-bg);color:var(--success);border-radius:8px;padding:9px 13px;font-size:0.82rem;margin-bottom:10px"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeReport()">Close</button>
          <button class="btn btn-warning" onclick="submitReport()">📤 Submit Report</button>
        </div>
      </div>
    </div>
  </div>
  `;

  // close dropdown on outside click
  document.addEventListener('click', e => {
    const dd = document.getElementById('user-dropdown');
    const ua = document.querySelector('.sidebar-user');
    if (dd && ua && !ua.contains(e.target)) dd.classList.remove('open');
  });
}

function toggleUserDropdown() {
  document.getElementById('user-dropdown')?.classList.toggle('open');
}

// ---- Settings ----
function openSettings() {
  document.getElementById('user-dropdown')?.classList.remove('open');
  document.getElementById('settings-modal')?.classList.add('show');
  switchSettingsTab('profile');
}
function closeSettings() {
  document.getElementById('settings-modal')?.classList.remove('show');
}
function switchSettingsTab(tab) {
  ['profile','security'].forEach(t => {
    document.getElementById(`stab-${t}`)?.classList.toggle('active', t===tab);
  });
  document.querySelectorAll('.settings-tab').forEach((el,i) => {
    el.classList.toggle('active', (i===0&&tab==='profile')||(i===1&&tab==='security'));
  });
}
async function saveSettings() {
  const user = getUser();
  const msgEl = document.getElementById('settings-msg');
  const name = document.getElementById('set-name')?.value.trim();
  const email = document.getElementById('set-email')?.value.trim();
  const phone = document.getElementById('set-phone')?.value.trim();
  const pass = document.getElementById('set-pass')?.value;
  const pass2 = document.getElementById('set-pass2')?.value;

  if (pass && pass !== pass2) {
    msgEl.innerHTML = '<div class="auth-error show">Passwords do not match.</div>';
    msgEl.style.display='block'; return;
  }

  const body = { userId: user.id };
  if (name) body.name = name;
  if (email) body.email = email;
  if (phone) body.phone = phone;
  if (pass) body.password = pass;

  try {
    const res = await fetch('/user/update', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      saveUser(data.user);
      msgEl.innerHTML = '<div class="auth-success show">✅ Profile updated successfully!</div>';
      msgEl.style.display='block';
      showToast('Profile updated!', 'success');
      setTimeout(() => { closeSettings(); renderSidebar(window._activePage||'dashboard'); }, 1200);
    } else {
      msgEl.innerHTML = `<div class="auth-error show">${data.error||'Update failed.'}</div>`;
      msgEl.style.display='block';
    }
  } catch(e) {
    msgEl.innerHTML = '<div class="auth-error show">Server error.</div>';
    msgEl.style.display='block';
  }
}

// ---- Report ----
function openReport() {
  document.getElementById('user-dropdown')?.classList.remove('open');
  document.getElementById('report-modal')?.classList.add('show');
  document.getElementById('report-ref').style.display='none';
}
function closeReport() {
  document.getElementById('report-modal')?.classList.remove('show');
  if(document.getElementById('report-desc')) document.getElementById('report-desc').value='';
}
async function submitReport() {
  const user = getUser();
  const desc = document.getElementById('report-desc')?.value.trim();
  try {
    const res = await fetch('/transaction/report', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: user.id, description: desc })
    });
    const data = await res.json();
    if (data.success) {
      const refEl = document.getElementById('report-ref');
      refEl.innerHTML = `✅ Report submitted! Reference ID: <strong>${data.referenceId}</strong>. Our team will contact you within 24 hours.`;
      refEl.style.display = 'block';
      showToast('Report submitted! We will contact you soon.', 'success', 5000);
    }
  } catch(e) { showToast('Server error.', 'error'); }
}

// ---- Formatters ----
function formatCurrency(amount) { return '₹' + Number(amount).toLocaleString('en-IN'); }
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function riskBadge(level) {
  const map = { LOW:'badge-low', MEDIUM:'badge-medium', HIGH:'badge-high' };
  const icons = { LOW:'🟢', MEDIUM:'🟡', HIGH:'🔴' };
  return `<span class="badge ${map[level]||'badge-info'}">${icons[level]||''} ${level||'?'}</span>`;
}
function statusBadge(status) {
  const map = { approved:'badge-approved', blocked:'badge-blocked', pending:'badge-pending' };
  const icons = { approved:'✓', blocked:'✕', pending:'⏳' };
  return `<span class="badge ${map[status]||'badge-info'}">${icons[status]||''} ${status||'?'}</span>`;
}
function typeBadge(type) {
  if(type==='transfer') return `<span class="badge badge-transfer">🏦 Transfer</span>`;
  return `<span class="badge badge-merchant">🛒 Merchant</span>`;
}
