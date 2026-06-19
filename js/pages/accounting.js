/* FinCraft · accounting.js — Live API */
import { api } from '../api.js';
import { fmt, num, sb, escapeHtml, fmtDate } from '../utils.js';
import { toast } from '../ui.js';

const TABS = ['Chart of Accounts','Journal Entries','Accounting Rules','GL Closure','Provisioning','Financial Activities'];

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Accounting</h1><div class="page-subtitle">GL, journal entries, closures, rules</div></div>
    </div>
    <div class="card">
      <div class="tabs">${TABS.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="acc-${i}">${t}</button>`).join('')}</div>
      ${TABS.map((t, i) => `<div id="acc-${i}" class="tab-panel ${i === 0 ? 'active' : ''}"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></div>`).join('')}
    </div>
  </div>`;

  // Chart of Accounts
  try {
    const gl = await api.glAccounts.list();
    const accounts = Array.isArray(gl) ? gl : [];
    const grouped = accounts.reduce((acc, a) => { (acc[a.type] ||= []).push(a); return acc; }, {});
    c.querySelector('#acc-0').innerHTML = `
      <div class="flex justify-between mb-4">
        <span class="text-muted">${accounts.length} accounts</span>
        <button class="btn-primary" data-modal="glAccountModal"><i class="fa-solid fa-plus"></i> Add GL Account</button>
      </div>
      ${Object.entries(grouped).map(([type, list]) => `
        <div class="card-header"><h3 class="card-title">${escapeHtml(type)} <span class="badge">${list.length}</span></h3></div>
        <div class="tbl-wrap mb-4"><table class="tbl">
          <thead><tr><th>Code</th><th>Name</th><th>Usage</th><th>Manual?</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td class="mono">${escapeHtml(a.glCode)}</td>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.usage?.value || 'DETAIL')}</td>
            <td>${a.manualEntriesAllowed ? '<span class="badge b-success">Yes</span>' : '<span class="badge">No</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>`).join('')}`;
  } catch (e) {
    c.querySelector('#acc-0').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div>
      <button class="btn-primary mt-4" data-modal="glAccountModal"><i class="fa-solid fa-plus"></i> Add GL Account</button></div>`;
  }

  // Journal Entries
  try {
    const res = await api.journalEntries.list({ limit: 50 });
    const entries = Array.isArray(res) ? res : (res?.pageItems || []);
    c.querySelector('#acc-1').innerHTML = `
      <div class="flex justify-between mb-4">
        <span class="text-muted">${entries.length} recent entries</span>
        <button class="btn-primary" data-modal="journalEntryModal"><i class="fa-solid fa-plus"></i> New Entry</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Date</th><th>Tx ID</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th><th>Reference</th></tr></thead>
        <tbody>${entries.length
          ? entries.map(je => `<tr>
              <td>${fmtDate(je.transactionDate)}</td>
              <td class="mono">${escapeHtml(je.transactionId || `#${je.id}`)}</td>
              <td>${escapeHtml(je.glAccount?.name || '—')}</td>
              <td><span class="badge b-teal">${escapeHtml(je.type?.value || '—')}</span></td>
              <td class="mono">${je.type?.value === 'DEBIT' ? fmt(je.amount) : '—'}</td>
              <td class="mono">${je.type?.value === 'CREDIT' ? fmt(je.amount) : '—'}</td>
              <td class="text-muted">${escapeHtml(je.comments || '—')}</td></tr>`).join('')
          : '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-book"></i><div>No journal entries</div></div></td></tr>'
        }</tbody>
      </table></div>`;
  } catch (e) {
    c.querySelector('#acc-1').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div>
      <button class="btn-primary mt-4" data-modal="journalEntryModal"><i class="fa-solid fa-plus"></i> New Entry</button></div>`;
  }

  // Accounting Rules
  try {
    const rules = await api.accountingRules.list();
    const list = Array.isArray(rules) ? rules : [];
    c.querySelector('#acc-2').innerHTML = `
      <div class="flex justify-between mb-4"><span class="text-muted">${list.length} rules</span><button class="btn-primary"><i class="fa-solid fa-plus"></i> Add Rule</button></div>
      ${list.length
        ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Office</th><th>Debit Account</th><th>Credit Account</th></tr></thead>
            <tbody>${list.map(r => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.officeName || 'All')}</td><td>${escapeHtml(r.debitAccounts?.[0]?.name || '—')}</td><td>${escapeHtml(r.creditAccounts?.[0]?.name || '—')}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><div>No accounting rules</div></div>'}`;
  } catch (e) {
    c.querySelector('#acc-2').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`;
  }

  // GL Closure
  try {
    const closures = await api.glClosures.list();
    const list = Array.isArray(closures) ? closures : [];
    c.querySelector('#acc-3').innerHTML = `
      <div class="flex justify-between mb-4"><span class="text-muted">${list.length} closures</span>
        <button class="btn-primary" id="gl-close-btn"><i class="fa-solid fa-lock"></i> New GL Closure</button></div>
      ${list.length
        ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Closing Date</th><th>Office</th><th>Comments</th></tr></thead>
            <tbody>${list.map(cl => `<tr><td>${fmtDate(cl.closingDate)}</td><td>${escapeHtml(cl.officeName || 'All')}</td><td>${escapeHtml(cl.comments || '—')}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty-state"><i class="fa-solid fa-lock-open"></i><div>No GL closures</div></div>'}`;
    c.querySelector('#gl-close-btn')?.addEventListener('click', async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        await api.glClosures.create({ closingDate: today, officeId: 1, comments: 'Manual closure', dateFormat: 'yyyy-MM-dd', locale: 'en' });
        toast('success', 'GL period closed', today); render(c);
      } catch (e) { toast('error', 'GL closure failed', e.message); }
    });
  } catch (e) {
    c.querySelector('#acc-3').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`;
  }

  // Provisioning & Financial Activities as empty-state stubs
  [4, 5].forEach(i => {
    c.querySelector(`#acc-${i}`).innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><div><b>${TABS[i]}</b></div><div class="text-muted mt-2">No records yet.</div><button class="btn-primary mt-4"><i class="fa-solid fa-plus"></i> Configure</button></div>`;
  });
}
