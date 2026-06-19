/* FinCraft · cmd.js — Command palette (Ctrl+K) + global search */
import { navigate, PAGE_REGISTRY } from './router.js';
import { openModal, theme } from './ui.js';
import { D } from './data.js';
import { escapeHtml } from './utils.js';

const palette = () => document.getElementById('cmdPalette');
const input   = () => document.getElementById('cmdInput');
const results = () => document.getElementById('cmdResults');

let CMDS = [];
let visibleCmds = [];
let selectedIdx = 0;

function buildCommands() {
  const nav = Object.entries(PAGE_REGISTRY).map(([key, def]) => ({
    icon: 'fa-solid ' + def.icon, cat: 'Navigate', label: 'Go to ' + def.label,
    run: () => navigate(key)
  }));
  const create = [
    { icon: 'fa-solid fa-user-plus',           label: 'Create Client',         cat: 'Create', run: () => openModal('newClientModal') },
    { icon: 'fa-solid fa-hand-holding-dollar', label: 'New Loan Application',  cat: 'Create', run: () => openModal('newLoanModal') },
    { icon: 'fa-solid fa-piggy-bank',          label: 'New Savings Account',   cat: 'Create', run: () => openModal('newSavingsModal') },
    { icon: 'fa-solid fa-vault',               label: 'New Fixed Deposit',     cat: 'Create', run: () => openModal('newFDModal') },
    { icon: 'fa-solid fa-chart-pie',           label: 'New Share Account',     cat: 'Create', run: () => openModal('newShareModal') },
    { icon: 'fa-solid fa-people-group',        label: 'New Group',             cat: 'Create', run: () => openModal('newGroupModal') },
    { icon: 'fa-solid fa-building-columns',    label: 'New Center',            cat: 'Create', run: () => openModal('newCenterModal') }
  ];
  const actions = [
    { icon: 'fa-solid fa-money-bill-transfer', label: 'Make Repayment',        cat: 'Action', run: () => openModal('repaymentModal') },
    { icon: 'fa-solid fa-right-left',          label: 'Account Transfer',      cat: 'Action', run: () => openModal('newTransferModal') },
    { icon: 'fa-solid fa-globe',               label: 'Send Remittance',       cat: 'Action', run: () => openModal('remittanceModal') },
    { icon: 'fa-solid fa-file-import',         label: 'Bulk Import',           cat: 'Action', run: () => openModal('bulkImportModal') },
    { icon: 'fa-solid fa-book',                label: 'Journal Entry',         cat: 'Action', run: () => openModal('journalEntryModal') },
    { icon: 'fa-solid fa-wand-magic-sparkles', label: 'Configuration Wizard',  cat: 'Action', run: () => openModal('configWizardModal') },
    { icon: 'fa-solid fa-play',                label: 'Run Report',            cat: 'Action', run: () => openModal('runReportModal') },
    { icon: 'fa-solid fa-terminal',            label: 'Ad-hoc SQL Query',      cat: 'Action', run: () => openModal('adhocQueryModal') }
  ];
  const settings = [
    { icon: 'fa-solid fa-circle-half-stroke', label: 'Toggle Dark / Light Theme', cat: 'Settings', run: () => theme.toggle() },
    { icon: 'fa-solid fa-id-badge', label: 'My Profile',  cat: 'Settings', run: () => navigate('profile') },
    { icon: 'fa-solid fa-gear',     label: 'Settings',    cat: 'Settings', run: () => navigate('settings') },
    { icon: 'fa-solid fa-right-from-bracket', label: 'Sign out', cat: 'Settings',
      run: () => import('./auth.js').then(m => m.logout()) }
  ];
  return [...nav, ...create, ...actions, ...settings];
}

function render(items) {
  visibleCmds = items;
  if (!items.length) {
    results().innerHTML = `<div class="empty-state" style="padding:24px">
      <i class="fa-solid fa-magnifying-glass"></i><div>No commands match</div></div>`;
    return;
  }
  let lastCat = '';
  let html = '';
  items.forEach((c, i) => {
    if (c.cat !== lastCat) {
      html += `<div class="nav-group-title" style="padding:8px 16px 4px">${c.cat}</div>`;
      lastCat = c.cat;
    }
    html += `<div class="cmd-row ${i === selectedIdx ? 'sel' : ''}" data-idx="${i}">
      <i class="${c.icon}"></i><span>${escapeHtml(c.label)}</span><span class="hint">${c.hint || ''}</span>
    </div>`;
  });
  results().innerHTML = html;
  results().querySelectorAll('.cmd-row').forEach(r => {
    r.addEventListener('click', () => run(parseInt(r.dataset.idx, 10)));
    r.addEventListener('mouseenter', () => { selectedIdx = parseInt(r.dataset.idx, 10); updateSelection(); });
  });
}
function updateSelection() {
  results().querySelectorAll('.cmd-row').forEach((r, i) => r.classList.toggle('sel', i === selectedIdx));
}
function run(idx) {
  const c = visibleCmds[idx];
  if (!c) return;
  closeCmd();
  try { c.run(); } catch (e) { console.error(e); }
}
function filter(q) {
  q = (q || '').toLowerCase().trim();
  if (!q) { selectedIdx = 0; render(CMDS); return; }
  const searchResults = gsSearch(q);
  const cmdMatches = CMDS.filter(c => c.label.toLowerCase().includes(q));
  selectedIdx = 0;
  render([...searchResults, ...cmdMatches]);
}
export function gsSearch(q) {
  q = q.toLowerCase();
  const out = [];
  for (const c of D.clients) if (c.displayName.toLowerCase().includes(q) || c.accountNo.includes(q))
    out.push({ icon: 'fa-solid fa-user', cat: 'Clients', label: c.displayName + ' · ' + c.accountNo,
               run: () => navigate('clients', { id: c.id }), hint: c.officeName });
  for (const l of D.loans) if (l.clientName.toLowerCase().includes(q) || l.accountNo.toLowerCase().includes(q))
    out.push({ icon: 'fa-solid fa-hand-holding-dollar', cat: 'Loans', label: l.accountNo + ' · ' + l.clientName,
               run: () => navigate('loans', { id: l.id }), hint: l.status });
  for (const g of D.groups) if (g.name.toLowerCase().includes(q))
    out.push({ icon: 'fa-solid fa-people-group', cat: 'Groups', label: g.name,
               run: () => navigate('groups', { id: g.id }), hint: g.members + ' members' });
  return out.slice(0, 6);
}
export function openCmd() {
  if (!CMDS.length) CMDS = buildCommands();
  palette().hidden = false;
  selectedIdx = 0;
  input().value = '';
  render(CMDS);
  setTimeout(() => input().focus(), 30);
}
export function closeCmd() { palette().hidden = true; }

document.addEventListener('input', e => { if (e.target.id === 'cmdInput') filter(e.target.value); });
document.addEventListener('keydown', e => {
  if (palette()?.hidden !== false) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(visibleCmds.length - 1, selectedIdx + 1); updateSelection(); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); updateSelection(); }
  if (e.key === 'Enter')     { e.preventDefault(); run(selectedIdx); }
});
document.addEventListener('click', e => { if (e.target === palette()) closeCmd(); });
