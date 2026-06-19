/* FinCraft · clients.js — Live API */
import { api } from '../api.js';
import { num, ini, sb, escapeHtml, fmtDate } from '../utils.js';
import { openModal, toast } from '../ui.js';

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">Clients</h1>
        <div class="page-subtitle"><span id="clients-count">—</span> clients across all offices</div></div>
      <div class="flex gap-2">
        <button class="btn-ghost" data-modal="bulkImportModal"><i class="fa-solid fa-file-import"></i> Bulk Import</button>
        <button class="btn-primary" data-modal="newClientModal"><i class="fa-solid fa-user-plus"></i> New Client</button>
      </div>
    </div>
    <div class="card">
      <div class="filter-bar">
        <input class="form-control" id="cf-search" placeholder="Search by name or account…" />
        <select class="form-control" id="cf-status">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select class="form-control" id="cf-office"><option value="">All Offices</option></select>
        <span style="flex:1"></span>
        <button class="btn-ghost" id="cf-export"><i class="fa-solid fa-download"></i> Export</button>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th></th><th>Name</th><th>Account</th><th>Office</th><th>Officer</th><th>Status</th><th>Since</th><th></th></tr></thead>
        <tbody id="clients-rows"><tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading clients…</div></div></td></tr></tbody>
      </table></div>
      <div id="cf-pagination" class="flex justify-between mt-4" style="display:none!important"></div>
    </div>
  </div>`;

  // Load offices for filter
  api.offices.list().then(offices => {
    const sel = c.querySelector('#cf-office');
    (Array.isArray(offices) ? offices : []).forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id; opt.textContent = o.name;
      sel.appendChild(opt);
    });
  }).catch(() => {});

  let allClients = [];
  let totalRecords = 0;
  let currentOffset = 0;
  const PAGE_SIZE = 50;

  async function loadClients(offset = 0) {
    c.querySelector('#clients-rows').innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></td></tr>';
    try {
      const q = c.querySelector('#cf-search')?.value?.trim() || '';
      const status = c.querySelector('#cf-status')?.value || '';
      const officeId = c.querySelector('#cf-office')?.value || '';
      const params = { limit: PAGE_SIZE, offset };
      if (q) params.displayName = q;
      if (status) params.status = status.toLowerCase();
      if (officeId) params.officeId = officeId;

      const res = await api.clients.list(params);
      allClients = Array.isArray(res) ? res : (res?.pageItems || []);
      totalRecords = res?.totalFilteredRecords ?? allClients.length;
      currentOffset = offset;
      c.querySelector('#clients-count').textContent = num(totalRecords);
      draw(allClients);
    } catch (e) {
      c.querySelector('#clients-rows').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message || 'Failed to load clients')}</div></div></td></tr>`;
    }
  }

  function draw(rows) {
    c.querySelector('#clients-rows').innerHTML = rows.map(cl => `
      <tr data-id="${cl.id}">
        <td><input type="checkbox"/></td>
        <td><div class="flex items-center gap-2" style="justify-content:flex-start"><div class="avatar">${ini(cl.displayName)}</div>${escapeHtml(cl.displayName || '—')}</div></td>
        <td class="mono">${escapeHtml(cl.accountNo || String(cl.id))}</td>
        <td>${escapeHtml(cl.officeName || '—')}</td>
        <td>${escapeHtml(cl.staffName || 'Unassigned')}</td>
        <td>${sb(cl.status?.value || cl.status || '—')}</td>
        <td>${fmtDate(cl.activationDate)}</td>
        <td>
          <button class="btn-ghost btn-sm" data-view-client="${cl.id}" title="View client">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-ghost btn-sm" data-activate-client="${cl.id}" title="Activate" style="${cl.status?.value === 'Pending' ? '' : 'display:none'}">
            <i class="fa-solid fa-check"></i>
          </button>
        </td>
      </tr>`).join('')
      || '<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-user-slash"></i><div>No clients match</div></div></td></tr>';

    c.querySelectorAll('[data-view-client]').forEach(b => b.addEventListener('click', () => {
      toast('info', `Client #${b.dataset.viewClient}`, 'Client detail panel');
    }));
    c.querySelectorAll('[data-activate-client]').forEach(b => b.addEventListener('click', async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        await api.clients.activate(b.dataset.activateClient, today);
        toast('success', 'Client activated', `#${b.dataset.activateClient} is now Active`);
        loadClients(currentOffset);
      } catch (e) {
        toast('error', 'Activation failed', e.message);
      }
    }));
  }

  await loadClients();

  let searchTimer;
  c.querySelector('#cf-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadClients(0), 400);
  });
  ['#cf-status', '#cf-office'].forEach(sel => {
    c.querySelector(sel)?.addEventListener('change', () => loadClients(0));
  });

  c.querySelector('#cf-export').addEventListener('click', () => {
    const rows = allClients.map(cl => [cl.accountNo, cl.displayName, cl.officeName, cl.staffName, cl.status?.value, cl.activationDate].join(','));
    const csv = ['Account,Name,Office,Officer,Status,Since', ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'clients.csv'; a.click();
    toast('success', 'Exported', 'clients.csv downloaded');
  });
}
