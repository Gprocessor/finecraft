/* FinCraft · collections.js — Live API */
import { api } from '../api.js';
import { fmt, escapeHtml } from '../utils.js';
import { toast } from '../ui.js';

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Collections</h1><div class="page-subtitle">Collection sheets for loan officers</div></div>
    </div>
    <div class="card">
      <div class="filter-bar">
        <select class="form-control" id="col-office"><option value="">Select Office…</option></select>
        <select class="form-control" id="col-officer"><option value="">Select Officer…</option></select>
        <input class="form-control" type="date" id="col-date" value="${new Date().toISOString().split('T')[0]}" />
        <button class="btn-primary" id="load-sheet"><i class="fa-solid fa-play"></i> Load Sheet</button>
      </div>
      <div id="sheet-area"><div class="empty-state"><i class="fa-solid fa-file-invoice-dollar"></i><div>Select filters and click <b>Load Sheet</b>.</div></div></div>
    </div>
  </div>`;

  const [offRes, staffRes] = await Promise.all([
    api.offices.list().catch(() => []),
    api.staff.list({ isLoanOfficer: true }).catch(() => [])
  ]);
  const offices = Array.isArray(offRes) ? offRes : [];
  const staffList = Array.isArray(staffRes) ? staffRes : (staffRes?.pageItems || []);

  const offSel = c.querySelector('#col-office');
  offices.forEach(o => { const opt = document.createElement('option'); opt.value = o.id; opt.textContent = o.name; offSel.appendChild(opt); });

  const offcrSel = c.querySelector('#col-officer');
  staffList.forEach(s => { const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.displayName; offcrSel.appendChild(opt); });

  c.querySelector('#load-sheet').addEventListener('click', async () => {
    const officeId = offSel.value;
    const staffId = offcrSel.value;
    const date = c.querySelector('#col-date').value;
    if (!officeId || !staffId || !date) { toast('warn', 'Missing filters', 'Select an office, officer, and date'); return; }

    c.querySelector('#sheet-area').innerHTML = '<div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading collection sheet…</div></div>';
    try {
      const [dd, mm, yyyy] = date.split('-').reverse().join('/').split('/');
      const res = await api.loans.list({ officeId, loanOfficerId: staffId, loanStatus: 'active', limit: 100 });
      const rows = Array.isArray(res) ? res : (res?.pageItems || []);

      if (!rows.length) {
        c.querySelector('#sheet-area').innerHTML = '<div class="empty-state"><i class="fa-solid fa-file-invoice-dollar"></i><div>No active loans for selected filters</div></div>';
        return;
      }

      c.querySelector('#sheet-area').innerHTML = `
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Client</th><th>Loan Account</th><th>Due Amount</th><th>Collected</th><th>Mode</th><th>Status</th></tr></thead>
          <tbody>${rows.map(l => `
            <tr>
              <td>${escapeHtml(l.clientName || l.clientDisplayName || '—')}</td>
              <td class="mono">${escapeHtml(l.accountNo || `#${l.id}`)}</td>
              <td class="mono">${fmt(l.summary?.totalOverdue || 0)}</td>
              <td><input class="form-control" type="number" min="0" step="0.01" placeholder="0.00" data-loan-id="${l.id}" style="width:140px"/></td>
              <td><select class="form-control" style="width:140px"><option>Cash</option><option>Mobile Money</option><option>Bank Transfer</option></select></td>
              <td id="row-status-${l.id}"><span class="badge b-warn">Pending</span></td>
            </tr>`).join('')}
          </tbody></table></div>
        <div class="flex justify-between mt-4">
          <button class="btn-ghost" id="print-sheet"><i class="fa-solid fa-print"></i> Print</button>
          <button class="btn-primary" id="save-sheet"><i class="fa-solid fa-save"></i> Post Collections</button>
        </div>`;

      c.querySelector('#save-sheet').addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        let posted = 0;
        for (const input of c.querySelectorAll('[data-loan-id]')) {
          const amount = parseFloat(input.value);
          if (!amount || amount <= 0) continue;
          try {
            await api.loans.repay(input.dataset.loanId, { transactionDate: today, transactionAmount: amount, dateFormat: 'yyyy-MM-dd', locale: 'en' });
            const statusEl = c.querySelector(`#row-status-${input.dataset.loanId}`);
            if (statusEl) statusEl.innerHTML = '<span class="badge b-success">Posted</span>';
            posted++;
          } catch (e) {
            const statusEl = c.querySelector(`#row-status-${input.dataset.loanId}`);
            if (statusEl) statusEl.innerHTML = `<span class="badge b-danger" title="${escapeHtml(e.message)}">Failed</span>`;
          }
        }
        toast(posted > 0 ? 'success' : 'warn', `${posted} repayment(s) posted`, 'Collection sheet saved');
      });

      c.querySelector('#print-sheet').addEventListener('click', () => window.print());
    } catch (e) {
      c.querySelector('#sheet-area').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`;
    }
  });
}
