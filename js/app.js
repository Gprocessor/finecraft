<<<<<<< HEAD
/* FinCraft · app.js — bootstrap */
import './ui.js';
import './modal-init.js';
import { initAuth } from './auth.js';

window.addEventListener('error', e => console.error('[fc-error]', e.error || e.message));
window.addEventListener('unhandledrejection', e => console.error('[fc-rejection]', e.reason));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', () => { initAuth(); });
=======
/**
 * FinCraft — app.js
 * Core app: auth, router, theme, toast, modal, tabs, dropdown, sidebar.
 * NO demo data — every table loads live from Fineract API.
 */

/* ── Global helpers ──────────────────────────────────────────── */
const fmt = (n, sym='$') =>
  sym + Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ini = n =>
  (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const statusBadge = s => {
  const map = {
    active:'b-active', pending:'b-pending', approved:'b-approved',
    closed:'b-closed', overdue:'b-overdue', inactive:'b-closed',
    rejected:'b-overdue', 'active_overdue':'b-overdue',
    submitted:'b-draft', overpaid:'b-info', 'write-off':'b-closed',
    readyfortransfer:'b-info', transferinprogress:'b-pending',
  };
  const key = (s||'').toLowerCase().replace(/\s+/g,'_');
  return `<span class="badge ${map[key]||'b-info'}">${s||'—'}</span>`;
};
const escHtml = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = arr => {
  if (!arr) return '—';
  if (Array.isArray(arr)) return new Date(arr[0],arr[1]-1,arr[2]).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  return String(arr);
};

/* ── Toast ───────────────────────────────────────────────────── */
const Toast = (() => {
  let ctr = 0;
  const icons = {success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle',warning:'fa-exclamation-triangle'};
  return {
    show(type, title, msg, dur=5000) {
      const id = 'toast-'+(++ctr);
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.id = id;
      el.innerHTML = `
        <i class="fa ${icons[type]||'fa-info-circle'} toast-icon"></i>
        <div class="toast-body">
          <div class="toast-title">${escHtml(title)}</div>
          ${msg?`<div class="toast-msg">${escHtml(msg)}</div>`:''}
        </div>
        <button onclick="this.closest('.toast').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);margin-left:auto;font-size:14px;padding:0 0 0 10px"><i class="fa fa-times"></i></button>`;
      document.getElementById('toastContainer').appendChild(el);
      setTimeout(()=>el?.remove(), dur);
    },
    success:(t,m)=>Toast.show('success',t,m),
    error  :(t,m)=>Toast.show('error',t,m),
    info   :(t,m)=>Toast.show('info',t,m),
    warning:(t,m)=>Toast.show('warning',t,m),
  };
})();

/* ── Loading overlay ─────────────────────────────────────────── */
const Loading = {
  show(msg='Loading…') {
    let el = document.getElementById('globalLoader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalLoader';
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:14px">
        <div style="width:40px;height:40px;border:3px solid var(--teal-glow);border-top-color:var(--teal-500);border-radius:50%;animation:spin 0.7s linear infinite"></div>
        <div style="font-size:13px;color:var(--text-secondary)" id="loaderMsg">${msg}</div>
      </div>`;
      el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);z-index:9000;display:flex;align-items:center;justify-content:center';
      document.body.appendChild(el);
    } else {
      document.getElementById('loaderMsg').textContent = msg;
    }
  },
  hide() { document.getElementById('globalLoader')?.remove(); },
};

/* ── Modal ───────────────────────────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    el.addEventListener('click', function handler(e) {
      if (e.target === el) { el.classList.remove('open'); el.removeEventListener('click',handler); }
    });
  },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); },
};

/* ── Dropdown ────────────────────────────────────────────────── */
const Dropdown = {
  toggle(id) {
    const el = document.getElementById(id);
    const was = el.classList.contains('open');
    document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
    if (!was) el.classList.add('open');
  },
};

/* ── Tabs ────────────────────────────────────────────────────── */
const Tabs = {
  switch(btn, panelId) {
    const bar = btn.closest('.tabs');
    bar.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const container = bar.parentElement;
    container.querySelectorAll(':scope > .tab-panel').forEach(p=>p.classList.remove('active'));
    document.getElementById(panelId)?.classList.add('active');
  },
};

/* ── Confirmation dialog ─────────────────────────────────────── */
function confirm(title, msg, onConfirm, danger=true) {
  const id = 'confirmModal';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id; el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal modal-sm">
      <div class="modal-header"><div class="modal-title" id="confTitle"></div><button class="modal-close" onclick="Modal.close('confirmModal')"><i class="fa fa-times"></i></button></div>
      <div class="modal-body"><p id="confMsg" style="font-size:13px;color:var(--text-secondary)"></p></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close('confirmModal')">Cancel</button><button id="confBtn" class="btn btn-danger"></button></div>
    </div>`;
    document.body.appendChild(el);
  }
  document.getElementById('confTitle').textContent = title;
  document.getElementById('confMsg').textContent   = msg;
  const btn = document.getElementById('confBtn');
  btn.textContent = danger ? 'Confirm' : 'OK';
  btn.className   = `btn ${danger?'btn-danger':'btn-primary'}`;
  btn.onclick = () => { Modal.close(id); onConfirm(); };
  Modal.open(id);
}

/* ── Charts ──────────────────────────────────────────────────── */
const Charts = {
  bars(containerId, vals, highlight=-1) {
    const el = document.getElementById(containerId);
    if (!el || !vals?.length) return;
    const mx = Math.max(...vals, 1);
    el.innerHTML = vals.map((v,i) => {
      const h = Math.max(4, Math.round(v/mx*100));
      return `<div class="chart-bar${(i===highlight||i===vals.length-1)?' hi':''}" style="height:${h}%" title="${v}"></div>`;
    }).join('');
  },
};

/* ── Router ──────────────────────────────────────────────────── */
const Router = {
  _current: null,
  _pages: {},

  register(id, onEnter) { this._pages[id] = onEnter; },

  navigate(pageId, params={}) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const page = document.getElementById('page-'+pageId);
    if (!page) { console.warn('Page not found: page-'+pageId); return; }
    page.classList.add('active');
    this._current = pageId;

    // Nav highlight
    document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');

    // Breadcrumb
    const labels = {
      dashboard:'Dashboard','client-detail':'Client Detail',clients:'Clients',
      loans:'Loans','loan-detail':'Loan Detail',savings:'Savings',
      deposits:'Deposits',shares:'Shares',groups:'Groups',centers:'Centers',
      collaterals:'Collaterals',collections:'Collections',transfers:'Transfers',
      remittances:'Remittances',accounting:'Accounting',tasks:'Checker Inbox',
      reports:'Reports',products:'Products',organization:'Organization',
      system:'System',users:'Users & Roles',templates:'Templates',
      'self-service':'Self Service',analytics:'Analytics',navigation:'Navigation',
      surveys:'Surveys',search:'Search',notifications:'Notifications',
      profile:'Profile',settings:'Settings',
    };
    document.getElementById('breadcrumb').textContent = labels[pageId]||pageId;

    // Close UI overlays
    Modal.closeAll();
    document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
    document.getElementById('gsResults')?.classList.remove('open');

    // Run page initializer
    if (this._pages[pageId]) this._pages[pageId](params);
  },
};

/* ── App core ────────────────────────────────────────────────── */
const App = {
  /* ── Login ─────────────────────────────────────────────── */
  async login(serverUrl, tenantId, username, password) {
    Loading.show('Signing in…');
    try {
      const data = await API.login(serverUrl, tenantId, username, password);
      if (!data.base64EncodedAuthenticationKey && !data.authenticated) {
        throw new Error('Invalid credentials');
      }
      FC_CONFIG.SERVER_URL  = serverUrl;
      FC_CONFIG.TENANT_ID   = tenantId;
      FC_CONFIG.USERNAME    = username;
      FC_CONFIG.AUTH_TOKEN  = data.base64EncodedAuthenticationKey;
      FC_CONFIG.USER_ROLES  = data.roles || [];
      this._enterApp();
    } catch(e) {
      Toast.error('Login Failed', e.message || 'Could not connect to server');
    } finally {
      Loading.hide();
    }
  },

  _enterApp() {
    document.getElementById('loginWrap').classList.remove('active');
    document.getElementById('appShell').classList.add('active');
    // Update sidebar / topbar with user info
    const u = FC_CONFIG.USERNAME;
    const t = FC_CONFIG.TENANT_ID;
    const av = u[0].toUpperCase();
    ['sbAvatar','profAvatar'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = av;
    });
    document.getElementById('sbName').textContent     = u;
    document.getElementById('sbTenant').textContent   = `${t} · Admin`;
    document.getElementById('tbTenant').textContent   = t;
    document.getElementById('profName').textContent   = u;
    document.getElementById('profUser').value         = u;
    document.getElementById('dashDate').textContent   =
      new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    document.getElementById('setUrl').value    = FC_CONFIG.SERVER_URL;
    document.getElementById('setTenant').value = FC_CONFIG.TENANT_ID;
    document.getElementById('sysUrl').textContent    = FC_CONFIG.SERVER_URL;
    document.getElementById('sysTenant').textContent = FC_CONFIG.TENANT_ID;

    Toast.success('Welcome!', `Signed in as ${u} on ${FC_CONFIG.SERVER_URL}`);
    Router.navigate('dashboard');
  },

  logout() {
    FC_CONFIG.AUTH_TOKEN = null;
    FC_CONFIG.USERNAME   = '';
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('loginWrap').classList.add('active');
    Toast.info('Signed out', 'See you next time');
  },

  /* ── Sidebar ───────────────────────────────────────────── */
  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
  },

  /* ── Theme ─────────────────────────────────────────────── */
  setTheme(t) {
    document.body.setAttribute('data-theme', t);
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = t==='dark'?'<i class="fa fa-moon"></i>':'<i class="fa fa-sun"></i>';
    localStorage.setItem('fc_theme', t);
  },
  toggleTheme() {
    const cur = document.body.getAttribute('data-theme')||'dark';
    App.setTheme(cur==='dark'?'light':'dark');
  },

  /* ── Settings save ─────────────────────────────────────── */
  saveSettings() {
    FC_CONFIG.SERVER_URL = document.getElementById('setUrl').value.trim().replace(/\/+$/,'');
    FC_CONFIG.TENANT_ID  = document.getElementById('setTenant').value.trim();
    document.getElementById('tbTenant').textContent  = FC_CONFIG.TENANT_ID;
    document.getElementById('sbTenant').textContent  = `${FC_CONFIG.TENANT_ID} · Admin`;
    document.getElementById('sysUrl').textContent    = FC_CONFIG.SERVER_URL;
    document.getElementById('sysTenant').textContent = FC_CONFIG.TENANT_ID;
    Toast.success('Settings Saved', 'Connection settings updated');
  },
};

/* ── Global Search ───────────────────────────────────────────── */
const GSearch = {
  _timer: null,

  onInput(q) {
    const res = document.getElementById('gsResults');
    clearTimeout(this._timer);
    if (!q || q.length < 2) { res.classList.remove('open'); return; }
    res.classList.add('open');
    res.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:13px"><i class="fa fa-spinner fa-spin"></i> Searching…</div>';
    this._timer = setTimeout(() => this._search(q), 400);
  },

  async _search(q) {
    const res = document.getElementById('gsResults');
    if (!FC_CONFIG.AUTH_TOKEN) { res.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:13px">Sign in to search</div>'; return; }
    try {
      const [clients, loans] = await Promise.allSettled([
        API.Clients.list({ displayName: q, limit: 5 }),
        API.Loans.list({ externalId: q, limit: 3 }),
      ]);
      const cl = clients.status==='fulfilled' ? (clients.value.pageItems||[]) : [];
      const ln = loans.status==='fulfilled'   ? (loans.value.pageItems||[])   : [];
      if (!cl.length && !ln.length) {
        res.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:13px">No results found</div>';
        return;
      }
      res.innerHTML =
        (cl.length ? '<div class="sr-group-label">Clients</div>' : '') +
        cl.map(c=>`<div class="sr-item" onclick="Pages.Clients.viewDetail(${c.id},'${escHtml(c.displayName)}','${escHtml(c.accountNo||'')}');document.getElementById('gsResults').classList.remove('open')">
          <div class="sr-icon" style="background:rgba(0,201,177,.1);color:var(--teal-500)"><i class="fa fa-user"></i></div>
          <div><div class="sr-type">Client</div><div class="sr-name">${escHtml(c.displayName)} — #${escHtml(c.accountNo||'')}</div></div>
        </div>`).join('') +
        (ln.length ? '<div class="sr-group-label">Loans</div>' : '') +
        ln.map(l=>`<div class="sr-item" onclick="Pages.Loans.viewDetail(${l.id});document.getElementById('gsResults').classList.remove('open')">
          <div class="sr-icon" style="background:rgba(251,191,36,.1);color:var(--amber-400)"><i class="fa fa-file-invoice-dollar"></i></div>
          <div><div class="sr-type">Loan</div><div class="sr-name">#${escHtml(l.accountNo||'')} · ${escHtml(l.clientName||'')}</div></div>
        </div>`).join('');
    } catch(e) {
      res.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-size:13px">Search failed</div>';
    }
  },
};

/* ── Keyboard shortcuts ──────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if ((e.metaKey||e.ctrlKey) && e.key==='k')        { e.preventDefault(); CMD.open(); }
  else if (e.key==='Escape')                          { Modal.closeAll(); CMD.close(); document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open')); document.getElementById('gsResults')?.classList.remove('open'); }
  else if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='N') { e.preventDefault(); Modal.open('newClientModal'); }
  else if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='L') { e.preventDefault(); Modal.open('newLoanModal'); }
  else if ((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==='R') { e.preventDefault(); Modal.open('repaymentModal'); }
  else if (e.key==='?' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
    Toast.info('Keyboard Shortcuts','Ctrl+K: Palette · Ctrl+Shift+N: New Client · Ctrl+Shift+L: New Loan · ESC: Close');
  }
});

/* Close dropdowns & search on outside click */
document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown'))           document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
  if (!e.target.closest('#gsInput') && !e.target.closest('#gsResults')) document.getElementById('gsResults')?.classList.remove('open');
});

/* ── Boot ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const saved = localStorage.getItem('fc_theme');
  App.setTheme(saved || FC_CONFIG.DEFAULT_THEME);

  // Set today's date on collection sheet
  const cd = document.getElementById('collDate');
  if (cd) cd.value = new Date().toISOString().slice(0,10);

  // Spin animation
  if (!document.querySelector('#spinKeyframe')) {
    const s = document.createElement('style');
    s.id = 'spinKeyframe';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
});
>>>>>>> 18cfd05 (Replace repository contents with provided js.zip extract)
