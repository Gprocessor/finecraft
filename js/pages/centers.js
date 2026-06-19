/* FinCraft · centers.js — Live API */
import { api } from '../api.js';
import { sb, escapeHtml } from '../utils.js';
import { toast } from '../ui.js';

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Centers</h1><div class="page-subtitle">Center hierarchy</div></div>
      <button class="btn-primary" data-modal="newCenterModal"><i class="fa-solid fa-plus"></i> New Center</button>
    </div>
    <div class="card">
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Account</th><th>Name</th><th>Office</th><th>Staff</th><th>Status</th><th></th></tr></thead>
        <tbody id="ctr-rows"><tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></td></tr></tbody>
      </table></div>
    </div>
  </div>`;
  try {
    const res = await api.centers.list({ limit: 100 });
    const list = Array.isArray(res) ? res : (res?.pageItems || []);
    c.querySelector('#ctr-rows').innerHTML = list.length
      ? list.map(s => `<tr>
          <td class="mono">${escapeHtml(s.accountNo || `C${s.id}`)}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.officeName || '—')}</td>
          <td>${escapeHtml(s.staffName || '—')}</td>
          <td>${sb(s.status?.value || '—')}</td>
          <td><button class="btn-ghost btn-sm" title="View"><i class="fa-solid fa-eye"></i></button></td></tr>`).join('')
      : '<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-building-columns"></i><div>No centers found</div></div></td></tr>';
  } catch (e) {
    c.querySelector('#ctr-rows').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div></td></tr>`;
  }
}
