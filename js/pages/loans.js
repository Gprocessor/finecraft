/* FinCraft · loans.js — Live API */
import { api } from '../api.js';
import { fmt, num, sb, escapeHtml, fmtDate } from '../utils.js';
import { toast } from '../ui.js';

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Loans</h1><div class="page-subtitle">Loan portfolio · all statuses</div></div>
      <button class="btn-primary" data-modal="newLoanModal"><i class="fa-solid fa-plus"></i> New Loan</button>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Active</div><div class="value" id="ln-active">—</div></div>
      <div class="stat-card c-warn"><div class="label">Pending Approval</div><div class="value" id="ln-pending">—</div></div>
      <div class="stat-card c-danger"><div class="label">Overdue</div><div class="value" id="ln-overdue">—</div></div>
      <div class="stat-card c-info"><div class="label">Total Records</div><div class="value" id="ln-total">—</div></div>
    </div>
    <div class="card">
      <div class="filter-bar">
        <input class="form-control" id="lf-search" placeholder="Search by account or client…" />
        <select class="form-control" id="lf-status">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="approvalPending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="overpaid">Overpaid</option>
          <option value="closedObligationsMet">Closed</option>
        </select>
        <select class="form-control" id="lf-product"><option value="">All Products</option></select>
        <span style="flex:1"></span>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Account</th><th>Client</th><th>Product</th><th>Principal</th><th>Outstanding</th><th>Next Due</th><th>Status</th><th>Officer</th><th></th></tr></thead>
        <tbody id="loans-rows"><tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading loans…</div></div></td></tr></tbody>
      </table></div>
    </div>
  </div>`;

  // Load products for filter
  api.loanProducts.list().then(products => {
    const sel = c.querySelector('#lf-product');
    (Array.isArray(products) ? products : []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }).catch(() => {});

  async function loadLoans() {
    c.querySelector('#loans-rows').innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></td></tr>';
    try {
      const params = { limit: 100 };
      const status = c.querySelector('#lf-status')?.value;
      const productId = c.querySelector('#lf-product')?.value;
      if (status) params.loanStatus = status;
      if (productId) params.loanProductId = productId;

      const res = await api.loans.list(params);
      const raw = Array.isArray(res) ? res : (res?.pageItems || []);
      let list = raw.map(l => ({
        id: l.id, accountNo: l.accountNo || `#${l.id}`,
        clientName: l.clientName || l.clientDisplayName || '—',
        product: l.loanProductName || l.productName || '—',
        principal: l.principal || l.approvedPrincipal || 0,
        outstanding: l.summary?.totalOutstanding ?? 0,
        nextDue: l.timeline?.expectedDisbursementDate,
        status: l.status?.value || '—',
        officer: l.loanOfficerName || '—'
      }));

      const q = c.querySelector('#lf-search')?.value?.toLowerCase() || '';
      if (q) list = list.filter(l => l.accountNo.toLowerCase().includes(q) || l.clientName.toLowerCase().includes(q));

      c.querySelector('#ln-total').textContent   = num(res?.totalFilteredRecords ?? list.length);
      c.querySelector('#ln-active').textContent  = num(list.filter(l => l.status === 'Active').length);
      c.querySelector('#ln-pending').textContent = num(list.filter(l => ['Submitted and pending approval', 'Approved'].includes(l.status)).length);
      c.querySelector('#ln-overdue').textContent = num(list.filter(l => l.outstanding > 0 && new Date(l.nextDue) < new Date()).length);

      c.querySelector('#loans-rows').innerHTML = list.map(l => `
        <tr data-id="${l.id}">
          <td class="mono">${escapeHtml(l.accountNo)}</td>
          <td>${escapeHtml(l.clientName)}</td>
          <td>${escapeHtml(l.product)}</td>
          <td class="mono">${fmt(l.principal)}</td>
          <td class="mono">${fmt(l.outstanding)}</td>
          <td>${fmtDate(l.nextDue)}</td>
          <td>${sb(l.status)}</td>
          <td>${escapeHtml(l.officer)}</td>
          <td>
            <button class="btn-ghost btn-sm" data-loan-approve="${l.id}" title="Approve" style="${l.status==='Submitted and pending approval'?'':'display:none'}">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-ghost btn-sm" data-loan-repay="${l.id}" title="Repayment" style="${l.status==='Active'?'':'display:none'}">
              <i class="fa-solid fa-money-bill"></i>
            </button>
            <button class="btn-ghost btn-sm" data-loan-view="${l.id}" title="View"><i class="fa-solid fa-eye"></i></button>
          </td>
        </tr>`).join('')
        || '<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-hand-holding-dollar"></i><div>No loans match</div></div></td></tr>';

      c.querySelectorAll('[data-loan-view]').forEach(b => b.addEventListener('click', () => toast('info', `Loan #${b.dataset.loanView}`, 'Full detail view')));
      c.querySelectorAll('[data-loan-approve]').forEach(b => b.addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
          await api.loans.approve(b.dataset.loanApprove, { approvedOnDate: today, dateFormat: 'yyyy-MM-dd', locale: 'en' });
          toast('success', 'Loan approved', `#${b.dataset.loanApprove}`);
          loadLoans();
        } catch (e) { toast('error', 'Approval failed', e.message); }
      }));
      c.querySelectorAll('[data-loan-repay]').forEach(b => b.addEventListener('click', () => {
        document.getElementById('repaymentModal')?.setAttribute('data-loan-id', b.dataset.loanRepay);
        document.querySelector('[data-modal="repaymentModal"]')?.click();
      }));
    } catch (e) {
      c.querySelector('#loans-rows').innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message || 'Failed to load loans')}</div></div></td></tr>`;
    }
  }

  await loadLoans();
  let t; c.querySelector('#lf-search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadLoans, 400); });
  c.querySelector('#lf-status').addEventListener('change', loadLoans);
  c.querySelector('#lf-product').addEventListener('change', loadLoans);
}
