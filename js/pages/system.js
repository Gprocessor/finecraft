/* FinCraft · system.js — Live API */
import { api } from '../api.js';
import { escapeHtml, fmtDate } from '../utils.js';
import { toast } from '../ui.js';
import { store } from '../store.js';

const TABS = ['Configurations','Audit Trails','Codes & Values','Roles & Permissions','Manage Jobs','External Services','System Info'];

export async function render(c) {
  c.innerHTML = `
  <div class="page active">
    <div class="page-header">
      <div><h1 class="page-title">System</h1><div class="page-subtitle">Platform configuration & maintenance</div></div>
    </div>
    <div class="card">
      <div class="tabs">${TABS.map((t, i) => `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="sy-${i}">${t}</button>`).join('')}</div>
      ${TABS.map((t, i) => `<div id="sy-${i}" class="tab-panel ${i === 0 ? 'active' : ''}"><div class="empty-state"><i class="fa-solid fa-circle-notch fa-spin"></i><div>Loading…</div></div></div>`).join('')}
    </div>
  </div>`;

  // Configurations
  try {
    const cf = await api.configurations.list();
    const list = Array.isArray(cf?.globalConfiguration) ? cf.globalConfiguration : (Array.isArray(cf) ? cf : []);
    c.querySelector('#sy-0').innerHTML = list.length
      ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Configuration</th><th>Value</th><th>Enabled</th></tr></thead>
          <tbody>${list.map(cfg => `<tr>
            <td>${escapeHtml(cfg.name)}</td>
            <td class="mono">${escapeHtml(String(cfg.value || ''))}</td>
            <td><label class="switch"><input type="checkbox" ${cfg.enabled ? 'checked' : ''} data-cfg="${cfg.id}"><span class="slider"></span></label></td>
          </tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><i class="fa-solid fa-gears"></i><div>No configurations found</div></div>';

    c.querySelectorAll('[data-cfg]').forEach(sw => sw.addEventListener('change', async () => {
      try { await api.configurations.update(sw.dataset.cfg, { enabled: sw.checked }); toast('success', 'Config updated', sw.dataset.cfg + (sw.checked ? ' enabled' : ' disabled')); }
      catch (e) { sw.checked = !sw.checked; toast('error', 'Update failed', e.message); }
    }));
  } catch (e) { c.querySelector('#sy-0').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`; }

  // Audit Trails
  try {
    const res = await api.audits.list({ limit: 50 });
    const list = Array.isArray(res) ? res : (res?.pageItems || []);
    c.querySelector('#sy-1').innerHTML = list.length
      ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Action</th><th>Entity</th><th>Resource</th><th>Maker</th><th>Made on</th><th>Status</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td><b>${escapeHtml(a.actionName || '—')}</b></td>
            <td>${escapeHtml(a.entityName || '—')}</td>
            <td class="mono">${escapeHtml(a.resourceId ? String(a.resourceId) : '—')}</td>
            <td>${escapeHtml(a.maker || '—')}</td>
            <td>${fmtDate(a.madeOnDate)}</td>
            <td><span class="badge ${a.processingResult?.value === 'Processed' ? 'b-success' : 'b-warn'}">${escapeHtml(a.processingResult?.value || '—')}</span></td>
          </tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><div>No audit trail records</div></div>';
  } catch (e) { c.querySelector('#sy-1').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`; }

  // Codes & Values
  try {
    const codes = await api.codes.list();
    const list = Array.isArray(codes) ? codes : [];
    c.querySelector('#sy-2').innerHTML = list.length
      ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Code Name</th><th>System Defined</th></tr></thead>
          <tbody>${list.map(cd => `<tr>
            <td>${escapeHtml(cd.name)}</td>
            <td>${cd.systemDefined ? '<span class="badge">System</span>' : '<span class="badge b-teal">Custom</span>'}</td>
          </tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><i class="fa-solid fa-list"></i><div>No codes defined</div></div>';
  } catch (e) { c.querySelector('#sy-2').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`; }

  // Roles
  try {
    const roles = await api.roles.list();
    const list = Array.isArray(roles) ? roles : [];
    c.querySelector('#sy-3').innerHTML = list.length
      ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Role</th><th>Description</th><th>Disabled</th></tr></thead>
          <tbody>${list.map(r => `<tr>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.description || '—')}</td>
            <td>${r.disabled ? '<span class="badge b-danger">Disabled</span>' : '<span class="badge b-success">Active</span>'}</td>
          </tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><i class="fa-solid fa-user-shield"></i><div>No roles defined</div></div>';
  } catch (e) { c.querySelector('#sy-3').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`; }

  // Jobs
  try {
    const jobs = await api.jobs.list();
    const list = Array.isArray(jobs) ? jobs : [];
    c.querySelector('#sy-4').innerHTML = list.length
      ? `<div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Job</th><th>Cron</th><th>Running?</th><th></th></tr></thead>
          <tbody>${list.map(j => `<tr>
            <td>${escapeHtml(j.displayName || j.name || '—')}</td>
            <td class="mono">${escapeHtml(j.cronExpression || '—')}</td>
            <td>${j.currentlyRunning ? '<span class="badge b-warn">Running</span>' : '<span class="badge">Idle</span>'}</td>
            <td><button class="btn-sm btn-primary" data-run-job="${j.jobId || j.name}"><i class="fa-solid fa-play"></i> Run</button></td>
          </tr>`).join('')}</tbody></table></div>`
      : '<div class="empty-state"><i class="fa-solid fa-calendar-check"></i><div>No scheduled jobs</div></div>';

    c.querySelectorAll('[data-run-job]').forEach(b => b.addEventListener('click', async () => {
      try { await api.jobs.runJob(b.dataset.runJob); toast('success', 'Job triggered', b.dataset.runJob + ' scheduled'); }
      catch (e) { toast('error', 'Job failed', e.message); }
    }));
  } catch (e) { c.querySelector('#sy-4').innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(e.message)}</div></div>`; }

  // External Services
  c.querySelector('#sy-5').innerHTML = `
    <div class="grid-2">
      ${['SMS','SMTP Email','S3 Storage','Notifications'].map(svc => `
        <div class="card" style="margin:0">
          <h3 class="card-title mb-3">${svc}</h3>
          <button class="btn-ghost btn-sm"><i class="fa-solid fa-pen"></i> Configure ${svc}</button>
        </div>`).join('')}
    </div>`;

  // System Info
  const a = store.get('auth') || {};
  c.querySelector('#sy-6').innerHTML = `
    <div class="card" style="margin:0">
      <h3 class="card-title mb-4">System Information</h3>
      <div class="grid-2">
        <div><div class="text-muted">Server URL</div><div class="mono">${escapeHtml(a.serverUrl || '—')}</div></div>
        <div><div class="text-muted">Tenant</div><div class="mono">${escapeHtml(a.tenantId || 'default')}</div></div>
        <div><div class="text-muted">User</div><div class="mono">${escapeHtml(a.username || '—')}</div></div>
        <div><div class="text-muted">Connection</div><div>${a.authToken ? '<span class="badge b-success">Live</span>' : '<span class="badge b-warn">Offline</span>'}</div></div>
        <div><div class="text-muted">UI Version</div><div class="mono">FinCraft 1.0.0</div></div>
        <div><div class="text-muted">API Base</div><div class="mono">/fineract-provider/api/v1</div></div>
      </div>
    </div>`;
}
