/* FinCraft · shares.js — Live API */
import { api } from '../api.js';
import { fmt, num, sb, escapeHtml } from '../utils.js';
import { toast } from '../ui.js';

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Shares</h1><div class="page-subtitle">Share accounts</div></div>
      <button class="btn-primary" data-modal="newShareModal"><i class="fa-solid fa-plus"></i> New Share Account</button>
    </div>
    <div class="card">
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Account</th><th>Client</th><th>Product</th><th>Requested Shares</th><th>Approved Shares</th><th>Status</th><th></th></tr></thead>
        <tbody id="sh-rows"><tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></td></tr></tbody>
      </table></div>
    </div>
  </div>`;

  try {
    const res = await api.shares.list({ limit: 100 });
    const list = Array.isArray(res) ? res : (res?.pageItems || []);
    c.querySelector('#sh-rows').innerHTML = list.length
      ? list.map(s => `<tr>
          <td class="mono">${escapeHtml(s.accountNo || `#${s.id}`)}</td>
          <td>${escapeHtml(s.clientName || '—')}</td>
          <td>${escapeHtml(s.productName || '—')}</td>
          <td class="mono">${num(s.requestedShares || 0)}</td>
          <td class="mono">${num(s.approvedShares || 0)}</td>
          <td>${sb(s.status?.value || '—')}</td>
          <td>
            <button class="btn-ghost btn-sm" data-sh-approve="${s.id}" title="Approve" style="${s.status?.value==='Submitted and pending approval'?'':'display:none'}"><i class="fa-solid fa-check"></i></button>
            <button class="btn-ghost btn-sm" title="View"><i class="fa-solid fa-eye"></i></button>
          </td></tr>`).join('')
      : '<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-chart-pie"></i><div>No share accounts found</div></div></td></tr>';

    c.querySelectorAll('[data-sh-approve]').forEach(b => b.addEventListener('click', async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        await api.shares.approve(b.dataset.shApprove, { approvedDate: today, dateFormat: 'yyyy-MM-dd', locale: 'en' });
        toast('success', 'Share account approved', `#${b.dataset.shApprove}`);
        render(c);
      } catch (e) { toast('error', 'Approval failed', e.message); }
    }));
  } catch (e) {
    c.querySelector('#sh-rows').innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div></td></tr>`;
  }
}
