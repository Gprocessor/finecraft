/**
 * FinCraft — cmd.js
 * Command Palette: 50+ commands, live client/loan search, keyboard navigation
 */

const CMD = (() => {
  let _focused = -1;
  let _filtered = [];

  const COMMANDS = [
    /* ── Navigate ─────────────────────────────── */
    { icon:'fa-th-large',         label:'Go to Dashboard',            cat:'Navigate', fn:()=>Router.navigate('dashboard') },
    { icon:'fa-chart-line',       label:'Go to Analytics',            cat:'Navigate', fn:()=>Router.navigate('analytics') },
    { icon:'fa-users',            label:'Go to Clients',              cat:'Navigate', fn:()=>Router.navigate('clients') },
    { icon:'fa-money-bill-wave',  label:'Go to Loans',                cat:'Navigate', fn:()=>Router.navigate('loans') },
    { icon:'fa-piggy-bank',       label:'Go to Savings',              cat:'Navigate', fn:()=>Router.navigate('savings') },
    { icon:'fa-vault',            label:'Go to Deposits',             cat:'Navigate', fn:()=>Router.navigate('deposits') },
    { icon:'fa-chart-pie',        label:'Go to Shares',               cat:'Navigate', fn:()=>Router.navigate('shares') },
    { icon:'fa-sitemap',          label:'Go to Groups',               cat:'Navigate', fn:()=>Router.navigate('groups') },
    { icon:'fa-map-marker-alt',   label:'Go to Centers',              cat:'Navigate', fn:()=>Router.navigate('centers') },
    { icon:'fa-hand-holding-usd', label:'Go to Collections',          cat:'Navigate', fn:()=>Router.navigate('collections') },
    { icon:'fa-exchange-alt',     label:'Go to Transfers',            cat:'Navigate', fn:()=>Router.navigate('transfers') },
    { icon:'fa-paper-plane',      label:'Go to Remittances',          cat:'Navigate', fn:()=>Router.navigate('remittances') },
    { icon:'fa-calculator',       label:'Go to Accounting',           cat:'Navigate', fn:()=>Router.navigate('accounting') },
    { icon:'fa-tasks',            label:'Go to Checker Inbox',        cat:'Navigate', fn:()=>Router.navigate('tasks') },
    { icon:'fa-chart-bar',        label:'Go to Reports',              cat:'Navigate', fn:()=>Router.navigate('reports') },
    { icon:'fa-box',              label:'Go to Products',             cat:'Navigate', fn:()=>Router.navigate('products') },
    { icon:'fa-building',         label:'Go to Organization',         cat:'Navigate', fn:()=>Router.navigate('organization') },
    { icon:'fa-cog',              label:'Go to System',               cat:'Navigate', fn:()=>Router.navigate('system') },
    { icon:'fa-user-shield',      label:'Go to Users & Roles',        cat:'Navigate', fn:()=>Router.navigate('users') },
    { icon:'fa-poll',             label:'Go to Surveys',              cat:'Navigate', fn:()=>Router.navigate('surveys') },
    { icon:'fa-compass',          label:'Go to Navigation Tree',      cat:'Navigate', fn:()=>Router.navigate('navigation') },
    { icon:'fa-search',           label:'Go to Search',               cat:'Navigate', fn:()=>Router.navigate('search') },
    { icon:'fa-bell',             label:'Go to Notifications',        cat:'Navigate', fn:()=>Router.navigate('notifications') },
    { icon:'fa-id-card',          label:'Go to My Profile',           cat:'Navigate', fn:()=>Router.navigate('profile') },
    { icon:'fa-sliders-h',        label:'Go to Settings',             cat:'Navigate', fn:()=>Router.navigate('settings') },
    { icon:'fa-mobile-alt',       label:'Go to Self Service',         cat:'Navigate', fn:()=>Router.navigate('self-service') },
    /* ── Create ────────────────────────────────── */
    { icon:'fa-user-plus',        label:'New Client',                 cat:'Create',   fn:()=>Modal.open('newClientModal') },
    { icon:'fa-file-invoice-dollar',label:'New Loan Application',     cat:'Create',   fn:()=>Modal.open('newLoanModal') },
    { icon:'fa-piggy-bank',       label:'New Savings Account',        cat:'Create',   fn:()=>Modal.open('newSavingsModal') },
    { icon:'fa-vault',            label:'New Fixed Deposit',          cat:'Create',   fn:()=>Modal.open('newFDModal') },
    { icon:'fa-chart-pie',        label:'New Share Account',          cat:'Create',   fn:()=>Modal.open('newShareModal') },
    { icon:'fa-sitemap',          label:'New Group',                  cat:'Create',   fn:()=>Modal.open('newGroupModal') },
    { icon:'fa-map-marker-alt',   label:'New Center',                 cat:'Create',   fn:()=>Modal.open('newCenterModal') },
    { icon:'fa-book',             label:'New Journal Entry',          cat:'Create',   fn:()=>Modal.open('journalEntryModal') },
    { icon:'fa-paper-plane',      label:'New Remittance',             cat:'Create',   fn:()=>Modal.open('remittanceModal') },
    { icon:'fa-exchange-alt',     label:'New Account Transfer',       cat:'Create',   fn:()=>Modal.open('newTransferModal') },
    /* ── Actions ───────────────────────────────── */
    { icon:'fa-hand-holding-usd', label:'Make Loan Repayment',        cat:'Action',   fn:()=>Modal.open('repaymentModal') },
    { icon:'fa-file-import',      label:'Bulk Import',                cat:'Action',   fn:()=>Modal.open('bulkImportModal') },
    { icon:'fa-magic',            label:'Configuration Wizard',       cat:'Action',   fn:()=>Modal.open('configWizardModal') },
    { icon:'fa-list-ol',          label:'Add GL Account',             cat:'Action',   fn:()=>Modal.open('glAccountModal') },
    { icon:'fa-receipt',          label:'New Charge',                 cat:'Action',   fn:()=>Modal.open('newChargeModal') },
    { icon:'fa-percent',          label:'New Tax Component',          cat:'Action',   fn:()=>Modal.open('newTaxModal') },
    { icon:'fa-sms',              label:'New SMS Campaign',           cat:'Action',   fn:()=>Modal.open('smsCampaignModal') },
    { icon:'fa-calendar-alt',     label:'Reschedule Loan',            cat:'Action',   fn:()=>Modal.open('loanRescheduleModal') },
    { icon:'fa-pen-nib',          label:'Write Off Loan',             cat:'Action',   fn:()=>Modal.open('loanWriteOffModal') },
    { icon:'fa-pause-circle',     label:'Add Interest Pause',         cat:'Action',   fn:()=>Modal.open('interestPauseModal') },
    { icon:'fa-database',         label:'Ad Hoc Query Builder',       cat:'Action',   fn:()=>Modal.open('adhocQueryModal') },
    { icon:'fa-shield-alt',       label:'Add Collateral',             cat:'Action',   fn:()=>Modal.open('newCollateralModal') },
    { icon:'fa-random',           label:'Bulk Loan Reassignment',     cat:'Action',   fn:()=>{ Router.navigate('organization'); setTimeout(()=>{ document.querySelector('[onclick*="org-bulk"]')?.click(); },300); } },
    { icon:'fa-play',             label:'Run COB Batch Job',          cat:'Action',   fn:()=>Pages.System.runJob(1) },
    { icon:'fa-calendar-day',     label:'Load Collection Sheet',      cat:'Action',   fn:()=>{ Router.navigate('collections'); } },
    /* ── Settings ──────────────────────────────── */
    { icon:'fa-moon',             label:'Toggle Dark / Light Mode',   cat:'Settings', fn:()=>App.toggleTheme() },
    { icon:'fa-lock',             label:'Enable Two-Factor Auth',     cat:'Settings', fn:()=>Modal.open('twoFactorModal') },
    { icon:'fa-sign-out-alt',     label:'Sign Out',                   cat:'Account',  fn:()=>App.logout() },
  ];

  /* ── Render ─────────────────────────────────────────────── */
  function _render(items) {
    const el = document.getElementById('cmdResults');
    if (!el) return;
    _filtered = items;
    _focused  = -1;

    if (!items.length) {
      el.innerHTML = `<div class="empty-state" style="padding:24px">
        <div class="empty-state-icon"><i class="fa fa-search"></i></div>
        <h3>No results</h3><p>Try a different keyword</p>
      </div>`;
      return;
    }

    const groups = {};
    items.forEach((c,i) => { if(!groups[c.cat]) groups[c.cat]=[]; groups[c.cat].push({...c,_i:i}); });

    el.innerHTML = Object.entries(groups).map(([cat, cmds]) => `
      <div class="cmd-group-label">${cat}</div>
      ${cmds.map(c => `
        <div class="cmd-item" data-idx="${c._i}"
             onmouseenter="_cmdFocus(${c._i})"
             onclick="CMD.run(${c._i})">
          <div class="cmd-item-icon"><i class="fa ${c.icon}"></i></div>
          <div class="cmd-item-label">${escHtml(c.label)}</div>
          <div class="cmd-item-cat">${escHtml(c.cat)}</div>
        </div>`).join('')}
    `).join('');
  }

  function _cmdFocus(idx) {
    document.querySelectorAll('.cmd-item').forEach(el => el.classList.remove('focused'));
    const el = document.querySelector(`.cmd-item[data-idx="${idx}"]`);
    if (el) { el.classList.add('focused'); _focused = idx; }
  }

  function _moveFocus(dir) {
    const items = document.querySelectorAll('.cmd-item');
    if (!items.length) return;
    let next = _focused + dir;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    const idx = parseInt(items[next].dataset.idx);
    _cmdFocus(idx);
    items[next].scrollIntoView({ block:'nearest' });
  }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    open() {
      document.getElementById('cmdPalette').classList.add('open');
      const inp = document.getElementById('cmdInput');
      if (!inp) return;
      inp.value = '';
      _render(COMMANDS);
      setTimeout(() => inp.focus(), 60);
    },

    close() {
      document.getElementById('cmdPalette')?.classList.remove('open');
    },

    filter(q) {
      if (!q) { _render(COMMANDS); return; }
      const ql = q.toLowerCase();
      _render(COMMANDS.filter(c =>
        c.label.toLowerCase().includes(ql) || c.cat.toLowerCase().includes(ql)
      ));
    },

    run(idx) {
      const cmd = _filtered[idx];
      if (cmd) { cmd.fn(); this.close(); }
    },

    handleKey(e) {
      if (e.key === 'ArrowDown')  { e.preventDefault(); _moveFocus(1); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); _moveFocus(-1); }
      if (e.key === 'Enter')      { e.preventDefault(); if (_focused >= 0) this.run(_focused); }
    },
  };
})();

/* Expose focus helper globally */
window._cmdFocus = (idx) => {
  document.querySelectorAll('.cmd-item').forEach(el => el.classList.remove('focused'));
  const el = document.querySelector(`.cmd-item[data-idx="${idx}"]`);
  if (el) el.classList.add('focused');
};

/* Wire keyboard inside palette */
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('cmdInput');
  if (inp) {
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        CMD.handleKey(e);
      }
    });
  }
});
