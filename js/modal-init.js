/* FinCraft · modal-init.js
   Runs after fc:modals-loaded.
   - Populates GL account selects in Journal Entry modal
   - Wires inline client search for loan/savings/fd/share modals
   - Wires add-row buttons for journal entry
   - Shows file name on bulk import select
*/
import { api } from './api.js';
import { escapeHtml } from './utils.js';

document.addEventListener('fc:modals-loaded', async () => {
  // ---- GL accounts for Journal Entry ----
  try {
    const gl = await api.glAccounts.list({ manualEntriesAllowed: true, usage: 'DETAIL' });
    const accounts = Array.isArray(gl) ? gl : [];
    const optHtml = '<option value="">Select GL account…</option>' +
      accounts.map(a => `<option value="${a.id}">${escapeHtml(a.glCode)} — ${escapeHtml(a.name)}</option>`).join('');

    document.querySelectorAll('[data-je-account]').forEach(sel => { sel.innerHTML = optHtml; });

    // Add-row buttons
    document.getElementById('add-debit-row')?.addEventListener('click', () => addJERow('je-debits-body', optHtml));
    document.getElementById('add-credit-row')?.addEventListener('click', () => addJERow('je-credits-body', optHtml));

    // When more rows are added dynamically, also populate them
    document.getElementById('journalEntryModal')?.addEventListener('je-row-added', () => {
      document.querySelectorAll('[data-je-account]').forEach(sel => {
        if (!sel.value && sel.options.length <= 1) sel.innerHTML = optHtml;
      });
    });
  } catch {}

  // Populate run-report modal name from trigger
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-report]');
    if (!b) return;
    const modal = document.getElementById('runReportModal');
    if (modal) {
      modal.dataset.report = b.dataset.report || '';
      const nameEl = document.getElementById('run-report-name');
      if (nameEl) nameEl.textContent = b.dataset.report || '—';
    }
  });

  // Share products — not covered by data-populate, load separately
  try {
    const sp = await api.shareProducts.list();
    const list = Array.isArray(sp) ? sp : [];
    const sel = document.getElementById('shareProductSel');
    if (sel && list.length) {
      sel.innerHTML = '<option value="">Select product…</option>' +
        list.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    }
  } catch {}

  // Bulk import — file name display
  document.getElementById('bulkImportFile')?.addEventListener('change', e => {
    const fn = document.getElementById('import-file-name');
    if (fn) fn.textContent = e.target.files[0]?.name || '';
  });

  // Inline client search for modals
  wireClientSearch('loanClientSearch', 'loanClientId', 'loanClientResults');
  wireClientSearch('savClientSearch',  'savClientId',  'savClientResults');
  wireClientSearch('fdClientSearch',   'fdClientId',   'fdClientResults');
  wireClientSearch('shClientSearch',   'shClientId',   'shClientResults');
});

function addJERow(tbodyId, optHtml) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><select class="form-control" data-je-account>${optHtml}</select></td>
    <td><input type="number" min="0" step="0.01" class="form-control" data-je-amount/></td>
    <td><button type="button" class="btn-ghost btn-sm" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash"></i></button></td>`;
  tbody.appendChild(tr);
}

function wireClientSearch(inputId, hiddenId, resultsId) {
  const input   = document.getElementById(inputId);
  const hidden  = document.getElementById(hiddenId);
  const results = document.getElementById(resultsId);
  if (!input || !hidden || !results) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { results.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      try {
        const res = await api.clients.list({ displayName: q, limit: 8 });
        const list = Array.isArray(res) ? res : (res?.pageItems || []);
        if (!list.length) { results.style.display = 'none'; return; }
        results.innerHTML = list.map(cl => `
          <div class="search-result-item" data-id="${cl.id}" data-name="${escapeHtml(cl.displayName)}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border-1)">
            <b>${escapeHtml(cl.displayName)}</b>
            <span class="text-muted" style="font-size:12px"> · ${escapeHtml(cl.accountNo || '')}</span>
          </div>`).join('');
        results.style.display = '';
        results.querySelectorAll('[data-id]').forEach(item => {
          item.addEventListener('click', () => {
            hidden.value = item.dataset.id;
            input.value  = item.dataset.name;
            results.style.display = 'none';
          });
        });
      } catch { results.style.display = 'none'; }
    }, 350);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) results.style.display = 'none';
  });
}
