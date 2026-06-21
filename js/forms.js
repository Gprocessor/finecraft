/**
 * FinCraft — forms.js
 * Populates form dropdowns with live Fineract template data.
 * Handles all form submissions not covered in pages.js.
 */

const Forms = (() => {

  /* ── Cache to avoid re-fetching on every modal open ──── */
  const _cache = {};
  async function cached(key, fn) {
    if (_cache[key]) return _cache[key];
    _cache[key] = await fn();
    return _cache[key];
  }

  /* ── Populate a <select> element ────────────────────── */
  function fillSelect(id, items, valKey, labelKey, placeholder='— Select —') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` +
      (items||[]).map(i => `<option value="${i[valKey]}">${escHtml(String(i[labelKey]||''))}</option>`).join('');
  }

  /* ── Offices ─────────────────────────────────────────── */
  async function loadOffices(selectIds=[]) {
    try {
      const data = await cached('offices', () => API.Organization.offices());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Office —'));
    } catch(e) { console.warn('Forms.loadOffices:', e.message); }
  }

  /* ── Staff / Loan Officers ────────────────────────────── */
  async function loadStaff(selectIds=[], loanOfficersOnly=false) {
    try {
      const data = await cached('staff', () => API.Organization.staff({ status:'active' }));
      const items = loanOfficersOnly ? (data||[]).filter(s=>s.isLoanOfficer) : (data||[]);
      selectIds.forEach(id => fillSelect(id, items.map(s=>({...s, displayName:s.displayName||`${s.firstname||''} ${s.lastname||''}`.trim()})), 'id', 'displayName', '— Select Staff —'));
    } catch(e) { console.warn('Forms.loadStaff:', e.message); }
  }

  /* ── Loan Products ────────────────────────────────────── */
  async function loadLoanProducts(selectIds=[]) {
    try {
      const data = await cached('loanProducts', () => API.Products.loanProducts());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Product —'));
    } catch(e) { console.warn('Forms.loadLoanProducts:', e.message); }
  }

  /* ── Savings Products ────────────────────────────────── */
  async function loadSavingsProducts(selectIds=[]) {
    try {
      const data = await cached('savingsProducts', () => API.Products.savingsProducts());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Product —'));
    } catch(e) { console.warn('Forms.loadSavingsProducts:', e.message); }
  }

  /* ── FD Products ─────────────────────────────────────── */
  async function loadFDProducts(selectIds=[]) {
    try {
      const data = await cached('fdProducts', () => API.Products.fdProducts());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Product —'));
    } catch(e) { console.warn('Forms.loadFDProducts:', e.message); }
  }

  /* ── Share Products ──────────────────────────────────── */
  async function loadShareProducts(selectIds=[]) {
    try {
      const data = await cached('shareProducts', () => API.Products.shareProducts());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Product —'));
    } catch(e) { console.warn('Forms.loadShareProducts:', e.message); }
  }

  /* ── Payment Types ───────────────────────────────────── */
  async function loadPaymentTypes(selectIds=[]) {
    try {
      const data = await cached('paymentTypes', () => API.Organization.paymentTypes());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Payment Type —'));
    } catch(e) { console.warn('Forms.loadPaymentTypes:', e.message); }
  }

  /* ── GL Accounts ─────────────────────────────────────── */
  async function loadGLAccounts(selectIds=[]) {
    try {
      const data = await cached('glAccounts', () => API.Accounting.glAccounts({ manualEntriesAllowed:true }));
      selectIds.forEach(id => fillSelect(id,
        (data||[]).map(a=>({...a, label:`${a.glCode} — ${a.name}`})),
        'id', 'label', '— Select GL Account —'));
    } catch(e) { console.warn('Forms.loadGLAccounts:', e.message); }
  }

  /* ── Funds ───────────────────────────────────────────── */
  async function loadFunds(selectIds=[]) {
    try {
      const data = await cached('funds', () => API.Organization.funds());
      selectIds.forEach(id => fillSelect(id, data, 'id', 'name', '— Select Fund —'));
    } catch(e) { console.warn('Forms.loadFunds:', e.message); }
  }

  /* ── Centers ─────────────────────────────────────────── */
  async function loadCenters(selectIds=[]) {
    try {
      const data = await cached('centers', () => API.Centers.list());
      const items = data.pageItems || [];
      selectIds.forEach(id => fillSelect(id, items, 'id', 'name', '— None —'));
    } catch(e) { console.warn('Forms.loadCenters:', e.message); }
  }

  /* ── Client search autocomplete ──────────────────────── */
  function setupClientSearch(inputId, hiddenId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    let timer;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = inp.value.trim();
        if (q.length < 2) return;
        try {
          const data = await API.Clients.list({ displayName:q, limit:8 });
          const items = data.pageItems||[];
          // Create/update datalist
          let dl = document.getElementById(inputId+'List');
          if (!dl) { dl = document.createElement('datalist'); dl.id = inputId+'List'; document.body.appendChild(dl); inp.setAttribute('list', dl.id); }
          dl.innerHTML = items.map(c=>`<option value="${escHtml(c.displayName||'')}" data-id="${c.id}">Client #${escHtml(c.accountNo||'')}</option>`).join('');
        } catch(e) {}
      }, 400);
    });
    inp.addEventListener('change', () => {
      const dl = document.getElementById(inputId+'List');
      if (!dl) return;
      const opt = Array.from(dl.options).find(o=>o.value===inp.value);
      if (opt) {
        const hidden = document.getElementById(hiddenId);
        if (hidden) hidden.value = opt.dataset.id || '';
      }
    });
  }

  /* ── Modal initialization hooks ──────────────────────── */
  const modalInits = {
    newClientModal    : () => Promise.all([loadOffices(['ncOffice']), loadStaff(['ncStaff'], true)]),
    newLoanModal      : () => Promise.all([loadLoanProducts(['nlProduct']), loadStaff(['nlOfficer'], true), loadFunds(['nlFund'])]),
    newSavingsModal   : () => Promise.all([loadSavingsProducts(['nsSavProduct']), loadStaff(['nsSavOfficer'], true)]),
    newFDModal        : () => loadFDProducts(['nfdProduct']),
    newShareModal     : () => loadShareProducts(['nshaProduct']),
    newGroupModal     : () => Promise.all([loadOffices(['ngOffice']), loadStaff(['ngStaff'], true), loadCenters(['ngCenter'])]),
    newCenterModal    : () => Promise.all([loadOffices(['nctrOffice']), loadStaff(['nctrStaff'], true)]),
    repaymentModal    : () => loadPaymentTypes(['rpPayType']),
    journalEntryModal : () => loadGLAccounts(['jeDebitGL','jeCreditGL']),
    glAccountModal    : () => loadGLAccounts(['glaParent']),
    newTransferModal  : () => {},
  };

  /* Intercept Modal.open to run init */
  const _origOpen = Modal.open.bind(Modal);
  Modal.open = function(id) {
    _origOpen(id);
    if (modalInits[id]) modalInits[id]();
  };

  /* ── Remittance stepper state ────────────────────────── */
  const Remit = {
    step: 1,
    next() {
      if (Remit.step < 4) {
        document.getElementById('remit-'+Remit.step).style.display = 'none';
        Remit.step++;
        document.getElementById('remit-'+Remit.step).style.display = '';
        Remit._update();
      } else {
        Remit._submit();
      }
    },
    back() {
      if (Remit.step > 1) {
        document.getElementById('remit-'+Remit.step).style.display = 'none';
        Remit.step--;
        document.getElementById('remit-'+Remit.step).style.display = '';
        Remit._update();
      }
    },
    reset() {
      [1,2,3,4].forEach(i => {
        const el = document.getElementById('remit-'+i);
        if (el) el.style.display = i===1 ? '' : 'none';
      });
      Remit.step = 1;
      Remit._update();
    },
    _update() {
      const nb = document.getElementById('remitNext');
      const bb = document.getElementById('remitBack');
      if (nb) nb.innerHTML = Remit.step < 4 ? '<i class="fa fa-arrow-right"></i> Next' : '<i class="fa fa-paper-plane"></i> Submit';
      if (bb) bb.style.display = Remit.step > 1 ? '' : 'none';
      for (let i=1; i<=4; i++) {
        const c = document.getElementById('rs'+i);
        const l = document.getElementById('rl'+i);
        const sl = document.getElementById('sl'+(i));
        if (c) {
          const done   = i < Remit.step;
          const active = i === Remit.step;
          c.style.background = done?'var(--green-400)':active?'var(--teal-500)':'var(--border)';
          c.style.color = (done||active) ? 'var(--navy-900)' : 'var(--text-muted)';
        }
        if (l) {
          l.style.color = i<Remit.step?'var(--green-400)':i===Remit.step?'var(--teal-500)':'var(--text-muted)';
          l.style.fontWeight = i<=Remit.step ? '600' : '';
        }
        if (sl && i < 4) sl.style.background = i < Remit.step ? 'var(--teal-500)' : 'var(--border)';
      }
    },
    async _submit() {
      Toast.success('Remittance', 'Transfer submitted successfully');
      Modal.close('remittanceModal');
      Remit.reset();
    },
  };

  /* ── Ad hoc query runner ─────────────────────────────── */
  async function runAdhocQuery() {
    const sql = document.getElementById('adhocSQL')?.value?.trim();
    if (!sql) { Toast.warning('Query', 'Please enter a SQL query'); return; }
    const res = document.getElementById('adhocResults');
    if (res) res.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px"><i class="fa fa-spinner fa-spin"></i> Running query…</div>';
    Loading.show('Running query…');
    try {
      const name = document.getElementById('adhocQueryName')?.value?.trim() || 'Custom Query';
      const data = await API.get(`/runreports/${encodeURIComponent(name)}`, { genericResultSet:true, sql });
      const cols = data.columnHeaders || [];
      const rows = data.data || [];
      if (res) {
        res.innerHTML = rows.length
          ? `<div class="card"><div class="card-header"><div class="card-title">${rows.length} row(s) returned</div>
              <button class="btn btn-secondary btn-sm" onclick="Forms.exportCSV()"><i class="fa fa-download"></i> Export CSV</button></div>
              <div class="tbl-wrap"><table class="tbl">
                <thead><tr>${cols.map(c=>`<th>${escHtml(c.columnName||'')}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(r=>`<tr>${(r.row||r||[]).map(v=>`<td class="fz-12">${escHtml(String(v||''))}</td>`).join('')}</tr>`).join('')}</tbody>
              </table></div></div>`
          : '<div class="empty-state" style="padding:30px"><div class="empty-state-icon"><i class="fa fa-table"></i></div><h3>Query returned no data</h3></div>';
      }
      Toast.success('Query Complete', `${rows.length} rows in ${Date.now()}ms`);
    } catch(e) {
      if (res) res.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div><h3>Query Error</h3><p style="color:var(--red-400)">${escHtml(e.message)}</p></div>`;
      Toast.error('Query Failed', e.message);
    } finally { Loading.hide(); }
  }

  /* ── SMS Campaign submit ─────────────────────────────── */
  async function submitSMSCampaign() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      campaignName     : g('smsName'),
      campaignType     : 1,
      businessRuleId   : 1,
      runReportName    : g('smsReport')||'Client Listing',
      paramValue       : '',
      message          : g('smsMessage'),
      recurrenceStartDate: g('smsStartDate'),
      isVisible        : true,
    };
    Loading.show('Creating campaign…');
    try {
      await API.Organization.createSmsCampaign(body);
      Modal.close('smsCampaignModal');
      Toast.success('SMS Campaign', 'Campaign created successfully');
    } catch(e) { Toast.error('Campaign Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── New Office submit ───────────────────────────────── */
  async function submitOffice() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      name        : g('offName'),
      parentId    : parseInt(g('offParent')||1),
      openingDate : g('offDate')||new Date().toISOString().slice(0,10),
      locale      : 'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Creating office…');
    try {
      await API.Organization.createOffice(body);
      Modal.close('newOfficeModal');
      Toast.success('Office Created', 'New office added');
      delete _cache['offices'];
      Pages.Organization.loadOffices();
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── New Staff submit ────────────────────────────────── */
  async function submitStaff() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      firstname     : g('stFirst'),
      lastname      : g('stLast'),
      officeId      : parseInt(g('stOffice')||1),
      isLoanOfficer : document.getElementById('stIsLO')?.checked||false,
      isActive      : true,
      joiningDate   : new Date().toISOString().slice(0,10),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Creating staff member…');
    try {
      await API.Organization.createStaff(body);
      Modal.close('newStaffModal');
      Toast.success('Staff Created', 'New staff member added');
      delete _cache['staff'];
      Pages.Organization.loadStaff();
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Loan reschedule submit ──────────────────────────── */
  async function submitReschedule() {
    const g = id => document.getElementById(id)?.value?.trim();
    const loanId = document.getElementById('rsLoanId')?.value;
    if (!loanId) { Toast.error('Error','No loan selected for reschedule'); return; }
    const body = {
      loanId          : parseInt(loanId),
      rescheduleFromDate: g('rsFromDate'),
      rescheduleReasonId: parseInt(g('rsReason')||1),
      submittedOnDate : new Date().toISOString().slice(0,10),
      adjustedDueDate : g('rsToDate')||undefined,
      newInterestRate : g('rsRate') ? parseFloat(g('rsRate')) : undefined,
      graceOnPrincipal: parseInt(g('rsGrace')||0),
      extraTerms      : parseInt(g('rsExtraTerms')||0),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Rescheduling loan…');
    try {
      await API.Loans.reschedule(body);
      Modal.close('loanRescheduleModal');
      Toast.success('Rescheduled','Loan repayment schedule updated');
      Pages.Loans.load();
    } catch(e) { Toast.error('Reschedule Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Write off submit ────────────────────────────────── */
  async function submitWriteOff() {
    const loanId  = document.getElementById('woLoanId')?.value;
    const confirm = document.getElementById('woConfirm')?.checked;
    if (!loanId)   { Toast.error('Error','No loan selected'); return; }
    if (!confirm)  { Toast.error('Error','Please confirm the write-off'); return; }
    const note = document.getElementById('woNote')?.value?.trim();
    Loading.show('Writing off loan…');
    try {
      await API.Loans.writeOff(loanId, {
        transactionDate: new Date().toISOString().slice(0,10),
        note, locale:'en', dateFormat:'yyyy-MM-dd',
      });
      Modal.close('loanWriteOffModal');
      Toast.warning('Written Off','Loan has been written off');
      Pages.Loans.load();
    } catch(e) { Toast.error('Write Off Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Interest pause submit ───────────────────────────── */
  async function submitInterestPause() {
    const loanId = Pages.LoanDetail._current?.id;
    if (!loanId) { Toast.error('Error','Open a loan first'); return; }
    const from = document.getElementById('ipFrom')?.value;
    const to   = document.getElementById('ipTo')?.value;
    if (!from||!to) { Toast.error('Error','Please select both dates'); return; }
    Loading.show('Applying interest pause…');
    try {
      await API.Loans.addInterestPause(loanId, { startDate:from, endDate:to, locale:'en', dateFormat:'yyyy-MM-dd' });
      Modal.close('interestPauseModal');
      Toast.success('Interest Paused','Interest pause applied to loan');
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Collateral submit ───────────────────────────────── */
  async function submitCollateral() {
    const g = id => document.getElementById(id)?.value?.trim();
    const clientId = g('collClientId');
    if (!clientId) { Toast.error('Error','Please select a client'); return; }
    const body = {
      clientCollateralId: parseInt(g('collTypeId')||1),
      quantity          : parseFloat(g('collValue')||0),
    };
    Loading.show('Adding collateral…');
    try {
      await API.Clients.addCollateral(clientId, body);
      Modal.close('newCollateralModal');
      Toast.success('Collateral Added','Collateral record saved');
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── 2FA setup ───────────────────────────────────────── */
  async function submit2FA() {
    const otp = document.getElementById('tfaCode')?.value?.trim();
    if (!otp || otp.length !== 6) { Toast.error('Invalid Code','Enter a 6-digit code'); return; }
    Loading.show('Verifying…');
    try {
      await API.post(FC_CONFIG.ENDPOINTS.TWO_FACTOR, { token: otp });
      Modal.close('twoFactorModal');
      const st = document.getElementById('twoFaStatus');
      if (st) { st.textContent='Enabled'; st.className='badge b-active'; }
      Toast.success('2FA Enabled','Two-factor authentication is now active');
    } catch(e) { Toast.error('Verification Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Bulk Reassign submit ────────────────────────────── */
  async function submitBulkReassign() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      fromLoanOfficerId : parseInt(g('brFrom')||0),
      toLoanOfficerId   : parseInt(g('brTo')||0),
      assignmentDate    : g('brDate')||new Date().toISOString().slice(0,10),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    if (!body.fromLoanOfficerId||!body.toLoanOfficerId) {
      Toast.error('Error','Please select both loan officers'); return;
    }
    Loading.show('Reassigning loans…');
    try {
      await API.Organization.bulkReassign(body);
      Toast.success('Reassigned','All loans reassigned successfully');
    } catch(e) { Toast.error('Reassignment Failed', e.message); }
    finally { Loading.hide(); }
  }

  /* ── Export CSV helper ───────────────────────────────── */
  function exportCSV() {
    const table = document.querySelector('#adhocResults table');
    if (!table) { Toast.warning('Export','No data to export'); return; }
    let csv = '';
    table.querySelectorAll('tr').forEach(row => {
      csv += Array.from(row.querySelectorAll('th,td')).map(c=>'"'+c.textContent.replace(/"/g,'""')+'"').join(',') + '\n';
    });
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'fincraft-export-'+Date.now()+'.csv';
    a.click();
    Toast.success('Exported','CSV file downloaded');
  }

  /* ── Public ──────────────────────────────────────────── */
  return {
    Remit,
    loadOffices, loadStaff, loadLoanProducts, loadSavingsProducts,
    loadFDProducts, loadShareProducts, loadPaymentTypes, loadGLAccounts,
    loadFunds, loadCenters, setupClientSearch,
    runAdhocQuery, exportCSV,
    submitSMSCampaign, submitOffice, submitStaff,
    submitReschedule, submitWriteOff, submitInterestPause,
    submitCollateral, submit2FA, submitBulkReassign,
    clearCache() { Object.keys(_cache).forEach(k=>delete _cache[k]); },
  };
})();
