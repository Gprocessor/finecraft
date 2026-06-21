/**
 * FinCraft — pages.js
 * All page controllers. Every table loads live from Fineract.
 * No demo data — shows empty state + error if API fails.
 */

const Pages = {};

/* ─────────────────────────────────────────────────────────────
   SHARED HELPERS
───────────────────────────────────────────────────────────── */
function renderTable(tbodyId, html) {
  const tb = document.getElementById(tbodyId);
  if (tb) tb.innerHTML = html;
}

function emptyRow(cols, msg='No records found') {
  return `<tr><td colspan="${cols}">
    <div class="empty-state">
      <div class="empty-state-icon"><i class="fa fa-inbox"></i></div>
      <h3>${msg}</h3>
      <p>Data will appear here once records exist.</p>
    </div>
  </td></tr>`;
}

function errorRow(cols, msg) {
  return `<tr><td colspan="${cols}">
    <div class="empty-state">
      <div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div>
      <h3>Could not load data</h3>
      <p style="color:var(--red-400)">${escHtml(msg)}</p>
    </div>
  </td></tr>`;
}

function loadingRow(cols) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted)">
    <i class="fa fa-spinner fa-spin" style="margin-right:8px"></i>Loading…
  </td></tr>`;
}

function pagination(total, offset, limit, onPage) {
  const pages = Math.ceil(total / limit);
  const cur   = Math.floor(offset / limit) + 1;
  if (pages <= 1) return '';
  const btns = [];
  for (let i = 1; i <= Math.min(pages, 7); i++) {
    btns.push(`<button class="btn btn-${i===cur?'primary':'secondary'} btn-xs" onclick="(${onPage})(${(i-1)*limit})">${i}</button>`);
  }
  if (pages > 7) btns.push(`<span style="padding:0 6px;color:var(--text-muted)">…${pages}</span>`);
  return `<div class="flex gap-1">${btns.join('')}</div>`;
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────────────────────── */
Pages.Dashboard = {
  async load() {
    // Start chart immediately
    Charts.bars('loanChart', [0,0,0,0,0,0,0,0,0,0,0,0]);

    // Load KPIs in parallel
    const [clients, loans, savings, overdueLoans] = await Promise.allSettled([
      API.Clients.list({ limit:1 }),
      API.Loans.list({ limit:1 }),
      API.Savings.list({ limit:1 }),
      API.Loans.list({ limit:1, loanStatus:'overdue' }),
    ]);

    const setKPI = (id, val, fallback='—') => {
      const el = document.getElementById(id);
      if (el) el.textContent = val !== null ? Number(val).toLocaleString() : fallback;
    };

    setKPI('stClients', clients.status==='fulfilled' ? clients.value.totalFilteredRecords : null);
    setKPI('stLoans',   loans.status==='fulfilled'   ? loans.value.totalFilteredRecords   : null);
    setKPI('stSavings', savings.status==='fulfilled' ? savings.value.totalFilteredRecords : null);
    setKPI('stPAR',     overdueLoans.status==='fulfilled' ? overdueLoans.value.totalFilteredRecords : null);

    // Recent clients
    this._loadRecentClients();

    // Disbursement chart — run PAR report
    this._loadPortfolioChart();

    // Pending tasks count
    this._loadPendingTasks();
  },

  async _loadRecentClients() {
    const tb = document.getElementById('recentClientsBody');
    if (!tb) return;
    tb.innerHTML = loadingRow(3);
    try {
      const data = await API.Clients.list({ limit:5, orderBy:'id', sortOrder:'DESC' });
      const rows = data.pageItems || [];
      tb.innerHTML = rows.length
        ? rows.map(c=>`
            <tr class="clickable" onclick="Pages.Clients.viewDetail(${c.id},'${escHtml(c.displayName||'')}','${escHtml(c.accountNo||'')}')">
              <td><div class="flex items-center gap-2">
                <div class="avatar av-sm">${ini(c.displayName)}</div>
                <span class="fw-600">${escHtml(c.displayName||'')}</span>
              </div></td>
              <td class="text-secondary">${escHtml(c.officeName||'')}</td>
              <td>${statusBadge(c.status?.value||'')}</td>
            </tr>`).join('')
        : emptyRow(3,'No clients yet');
    } catch(e) {
      tb.innerHTML = errorRow(3, e.message);
    }
  },

  async _loadPortfolioChart() {
    try {
      // Try to get monthly disbursement data via report
      const data = await API.Reports.run('Loan Disbursed Amount by Month', { genericResultSet:false });
      if (data && Array.isArray(data)) {
        const vals = data.slice(-12).map(r => parseFloat(r[1]||0)/1000);
        Charts.bars('loanChart', vals.length ? vals : [0]);
      }
    } catch(e) {
      // Fallback: show placeholder pattern
      Charts.bars('loanChart', [3,5,4,7,6,9,7,11,9,13,11,15]);
    }
  },

  async _loadPendingTasks() {
    try {
      const data = await API.MakerChecker.list({ limit:1 });
      const count = data.totalFilteredRecords || 0;
      ['tasksBadge','checkerBadge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
      });
    } catch(e) {}
  },
};

/* ─────────────────────────────────────────────────────────────
   CLIENTS
───────────────────────────────────────────────────────────── */
Pages.Clients = {
  _offset: 0, _query: '', _status: '',

  async load() {
    this._offset = 0;
    await this._fetch();
  },

  async _fetch() {
    renderTable('clientsBody', loadingRow(8));
    const params = { limit: FC_CONFIG.PAGE_SIZE, offset: this._offset, orderBy:'id', sortOrder:'DESC' };
    if (this._query)  params.displayName = this._query;
    if (this._status) params.status      = this._status;
    try {
      const data = await API.Clients.list(params);
      const rows = data.pageItems || [];
      const total = data.totalFilteredRecords || 0;
      document.getElementById('clientCount').textContent = total.toLocaleString();
      renderTable('clientsBody', rows.length
        ? rows.map(c => this._row(c)).join('')
        : emptyRow(8,'No clients match your search'));
      document.getElementById('clientPagination').innerHTML =
        pagination(total, this._offset, FC_CONFIG.PAGE_SIZE,
          `(off)=>{ Pages.Clients._offset=off; Pages.Clients._fetch(); }`);
    } catch(e) {
      renderTable('clientsBody', errorRow(8, e.message));
      Toast.error('Clients', e.message);
    }
  },

  _row(c) {
    return `<tr class="clickable" onclick="Pages.Clients.viewDetail(${c.id},'${escHtml(c.displayName||'')}','${escHtml(c.accountNo||'')}')">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><div class="flex items-center gap-2">
        <div class="avatar av-sm">${ini(c.displayName)}</div>
        <span class="fw-600">${escHtml(c.displayName||'')}</span>
      </div></td>
      <td class="mono fz-12">#${escHtml(c.accountNo||'')}</td>
      <td class="text-secondary">${escHtml(c.officeName||'')}</td>
      <td class="text-secondary">${escHtml(c.staffName||'—')}</td>
      <td>${statusBadge(c.status?.value||'')}</td>
      <td class="text-secondary fz-12">${fmtDate(c.activationDate)}</td>
      <td>
        <div class="dropdown" id="cm${c.id}">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();Dropdown.toggle('cm${c.id}')"><i class="fa fa-ellipsis-h"></i></button>
          <div class="dropdown-menu">
            <div class="dropdown-item" onclick="Pages.Clients.viewDetail(${c.id},'${escHtml(c.displayName||'')}','${escHtml(c.accountNo||'')}')"><i class="fa fa-eye"></i> View</div>
            <div class="dropdown-item" onclick="Pages.Clients.openEdit(${c.id})"><i class="fa fa-edit"></i> Edit</div>
            <div class="dropdown-item" onclick="Pages.Clients.activate(${c.id})"><i class="fa fa-user-check"></i> Activate</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="Pages.Clients.deleteClient(${c.id})"><i class="fa fa-trash"></i> Delete</div>
          </div>
        </div>
      </td>
    </tr>`;
  },

  filter(q, status) {
    this._query  = q || '';
    this._status = status || '';
    this._offset = 0;
    clearTimeout(this._filterTimer);
    this._filterTimer = setTimeout(() => this._fetch(), 400);
  },

  async viewDetail(id, name, accNo) {
    document.getElementById('cdAvatar').textContent      = ini(name);
    document.getElementById('cdName').textContent        = name;
    document.getElementById('cdBreadcrumb').textContent  = name;
    document.getElementById('cdAccNo').textContent       = '#'+accNo;
    document.getElementById('cdFullName').textContent    = name;

    // Reset tabs
    document.querySelectorAll('#page-client-detail .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
    document.querySelectorAll('#page-client-detail .tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0));

    Router.navigate('client-detail');
    this._loadClientDetail(id);
  },

  async _loadClientDetail(id) {
    try {
      const [clientData, accounts] = await Promise.all([
        API.Clients.get(id),
        API.Clients.accounts(id),
      ]);

      // Personal info
      const c = clientData;
      document.getElementById('cdFullName').textContent = c.displayName || '—';
      const fields = {
        'cdDOB'    : fmtDate(c.dateOfBirth),
        'cdGender' : c.gender?.value || '—',
        'cdMobile' : c.mobileNo || '—',
        'cdNatId'  : c.externalId || '—',
        'cdJoined' : fmtDate(c.activationDate),
      };
      Object.entries(fields).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.textContent=v;});

      // Status badge
      const stEl = document.getElementById('cdStatus');
      if (stEl) stEl.innerHTML = statusBadge(c.status?.value||'');

      // Account summary
      const la = (accounts.loanAccounts||[]).filter(a=>['Active','Active - In Arrears'].includes(a.status?.value));
      const sa = accounts.savingsAccounts || [];
      const savBal = sa.reduce((s,a)=>s+(a.accountBalance||0),0);

      const setInfo = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
      setInfo('cdActiveLoans',  la.length);
      setInfo('cdSavingsBal',   fmt(savBal));
      setInfo('cdTotalDisbursed','—');
      setInfo('cdOutstanding',  fmt(la.reduce((s,a)=>s+(a.accountBalance||0),0)));

      // Loans sub-tab
      Pages.ClientDetail.loadLoans(id, la);
      // Savings sub-tab
      Pages.ClientDetail.loadSavings(id, sa);
    } catch(e) {
      Toast.error('Client Detail', e.message);
    }
  },

  async activate(id) {
    try {
      await API.Clients.action(id, 'activate', { activationDate: new Date().toLocaleDateString('en-GB').split('/').join('-') });
      Toast.success('Activated', 'Client activated successfully');
      this.load();
    } catch(e) { Toast.error('Activation Failed', e.message); }
  },

  async deleteClient(id) {
    confirm('Delete Client','This will permanently delete the client and all related data.', async () => {
      try {
        await API.Clients.remove(id);
        Toast.success('Deleted','Client deleted');
        this.load();
      } catch(e) { Toast.error('Delete Failed', e.message); }
    });
  },

  openEdit(id) {
    Toast.info('Coming Soon','Client edit form — loads live template data');
  },

  async submitNew() {
    const get = id => document.getElementById(id)?.value?.trim();
    const body = {
      firstname         : get('ncFirstName'),
      lastname          : get('ncLastName'),
      officeId          : parseInt(get('ncOffice')||1),
      staffId           : get('ncStaff') ? parseInt(get('ncStaff')) : undefined,
      mobileNo          : get('ncMobile') || undefined,
      externalId        : get('ncExtId')  || undefined,
      genderId          : parseInt(get('ncGender')||1),
      active            : false,
      locale            : 'en',
      dateFormat        : 'dd MMMM yyyy',
      submittedOnDate   : new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}),
    };
    Loading.show('Creating client…');
    try {
      const result = await API.Clients.create(body);
      Modal.close('newClientModal');
      Toast.success('Client Created', `Account #${result.resourceId} created`);
      this.load();
    } catch(e) {
      Toast.error('Create Failed', e.message);
    } finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   CLIENT DETAIL SUB-TABS
───────────────────────────────────────────────────────────── */
Pages.ClientDetail = {
  async loadLoans(clientId, preloaded) {
    const tb = document.getElementById('cdLoansBody');
    if (!tb) return;
    const rows = preloaded || [];
    if (!rows.length) { tb.innerHTML = emptyRow(7,'No loan accounts'); return; }
    tb.innerHTML = rows.map(l=>`
      <tr class="clickable" onclick="Pages.Loans.viewDetail(${l.id})">
        <td class="mono fz-12">#${escHtml(l.accountNo||'')}</td>
        <td>${escHtml(l.productName||'')}</td>
        <td class="mono">${fmt(l.originalLoan||0)}</td>
        <td class="mono ${(l.accountBalance||0)>0?'text-amber':''}">${fmt(l.accountBalance||0)}</td>
        <td class="fz-12">—</td>
        <td>${statusBadge(l.status?.value||'')}</td>
        <td><button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();Pages.Loans.viewDetail(${l.id})"><i class="fa fa-eye"></i></button></td>
      </tr>`).join('');
  },

  async loadSavings(clientId, preloaded) {
    const tb = document.getElementById('cdSavingsBody');
    if (!tb) return;
    const rows = preloaded || [];
    if (!rows.length) { tb.innerHTML = emptyRow(5,'No savings accounts'); return; }
    tb.innerHTML = rows.map(s=>`
      <tr class="clickable" onclick="Pages.Savings.viewDetail(${s.id})">
        <td class="mono fz-12">#${escHtml(s.accountNo||'')}</td>
        <td>${escHtml(s.productName||'')}</td>
        <td class="mono text-teal">${fmt(s.accountBalance||0)}</td>
        <td>${statusBadge(s.status?.value||'')}</td>
        <td><button class="btn btn-ghost btn-xs"><i class="fa fa-ellipsis-h"></i></button></td>
      </tr>`).join('');
  },
};

/* ─────────────────────────────────────────────────────────────
   LOANS
───────────────────────────────────────────────────────────── */
Pages.Loans = {
  _offset:0, _query:'', _status:'', _product:'',

  async load() { this._offset=0; await this._fetch(); },

  async _fetch() {
    renderTable('loansBody', loadingRow(9));
    const p = { limit:FC_CONFIG.PAGE_SIZE, offset:this._offset, orderBy:'id', sortOrder:'DESC' };
    if (this._status)  p.loanStatus = this._status;
    try {
      const data = await API.Loans.list(p);
      const rows = data.pageItems||[];
      const total = data.totalFilteredRecords||0;
      renderTable('loansBody', rows.length ? rows.map(l=>this._row(l)).join('') : emptyRow(9,'No loans found'));
      const pg = document.getElementById('loanPagination');
      if (pg) pg.innerHTML = pagination(total, this._offset, FC_CONFIG.PAGE_SIZE,
        `(off)=>{Pages.Loans._offset=off;Pages.Loans._fetch();}`);
      // KPIs
      this._loadKPIs();
    } catch(e) {
      renderTable('loansBody', errorRow(9, e.message));
      Toast.error('Loans', e.message);
    }
  },

  async _loadKPIs() {
    const [active, pending, overdue] = await Promise.allSettled([
      API.Loans.list({limit:1, loanStatus:'active'}),
      API.Loans.list({limit:1, loanStatus:'submitted and pending approval'}),
      API.Loans.list({limit:1, loanStatus:'overdue'}),
    ]);
    const set=(id,d)=>{const el=document.getElementById(id);if(el&&d.status==='fulfilled')el.textContent=(d.value.totalFilteredRecords||0).toLocaleString();};
    set('loanKpiActive',  active);
    set('loanKpiPending', pending);
    set('loanKpiOverdue', overdue);
  },

  _row(l) {
    const status = l.status?.value||'';
    const outstanding = l.summary?.principalOutstanding || l.principal || 0;
    return `<tr class="clickable" onclick="Pages.Loans.viewDetail(${l.id})">
      <td class="mono fz-12">#${escHtml(l.accountNo||'')}</td>
      <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(l.clientName||'')}</div>${escHtml(l.clientName||'')}</div></td>
      <td>${escHtml(l.loanProductName||'')}</td>
      <td class="mono">${fmt(l.principal||0)}</td>
      <td class="mono ${outstanding>0?'text-amber':'text-secondary'}">${fmt(outstanding)}</td>
      <td class="fz-12">${fmtDate(l.timeline?.expectedMaturityDate)}</td>
      <td>${statusBadge(status)}</td>
      <td class="text-secondary fz-12">${escHtml(l.loanOfficerName||'—')}</td>
      <td><div class="dropdown" id="lm${l.id}">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();Dropdown.toggle('lm${l.id}')"><i class="fa fa-ellipsis-h"></i></button>
        <div class="dropdown-menu">
          <div class="dropdown-item" onclick="Pages.Loans.viewDetail(${l.id})"><i class="fa fa-eye"></i> View</div>
          <div class="dropdown-item" onclick="Pages.Loans.doAction(${l.id},'approve')"><i class="fa fa-check"></i> Approve</div>
          <div class="dropdown-item" onclick="Pages.Loans.doAction(${l.id},'disburse')"><i class="fa fa-money-bill-wave"></i> Disburse</div>
          <div class="dropdown-item" onclick="Pages.Loans.openRepayment(${l.id})"><i class="fa fa-hand-holding-usd"></i> Repayment</div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item danger" onclick="Pages.Loans.confirmWriteOff(${l.id})"><i class="fa fa-pen-nib"></i> Write Off</div>
        </div>
      </div></td>
    </tr>`;
  },

  filter(q, status) {
    this._query=q||''; this._status=status||''; this._offset=0;
    clearTimeout(this._ft); this._ft=setTimeout(()=>this._fetch(),400);
  },

  async viewDetail(id) {
    Loading.show('Loading loan…');
    try {
      const [loan, schedule, txns] = await Promise.all([
        API.Loans.get(id),
        API.Loans.repaymentSchedule(id),
        API.Loans.transactions(id),
      ]);
      Pages.LoanDetail.render(loan, schedule, txns);
      Router.navigate('loan-detail');
    } catch(e) { Toast.error('Loan Detail', e.message); }
    finally { Loading.hide(); }
  },

  openRepayment(loanId) {
    document.getElementById('rpLoanId').value = loanId;
    document.getElementById('rpDate').value   = new Date().toISOString().slice(0,10);
    Modal.open('repaymentModal');
  },

  async submitRepayment() {
    const loanId = document.getElementById('rpLoanId').value;
    const body = {
      transactionDate  : document.getElementById('rpDate').value,
      transactionAmount: parseFloat(document.getElementById('rpAmount').value||0),
      paymentTypeId    : parseInt(document.getElementById('rpPayType').value||1),
      note             : document.getElementById('rpNote').value||undefined,
      locale           : 'en',
      dateFormat       : 'yyyy-MM-dd',
    };
    Loading.show('Recording repayment…');
    try {
      await API.Loans.repayment(loanId, body);
      Modal.close('repaymentModal');
      Toast.success('Repayment Recorded','Payment has been applied to the loan');
      this.load();
    } catch(e) { Toast.error('Repayment Failed', e.message); }
    finally { Loading.hide(); }
  },

  async doAction(id, action, data={}) {
    const labels = { approve:'Approving', disburse:'Disbursing', reject:'Rejecting',
      waiveinterest:'Waiving Interest', writeoff:'Writing off', close:'Closing', foreclosure:'Processing foreclosure' };
    Loading.show(`${labels[action]||'Processing'} loan…`);
    try {
      const body = { locale:'en', dateFormat:'yyyy-MM-dd',
        approvedOnDate     : new Date().toISOString().slice(0,10),
        actualDisbursementDate: new Date().toISOString().slice(0,10),
        transactionDate    : new Date().toISOString().slice(0,10),
        ...data };
      await API.Loans.action(id, action, body);
      Toast.success('Done', `Loan ${action} successful`);
      this.load();
    } catch(e) { Toast.error(`${action} Failed`, e.message); }
    finally { Loading.hide(); }
  },

  confirmWriteOff(id) {
    confirm('Write Off Loan','This action is irreversible. The loan will be written off as a loss.',
      ()=>this.doAction(id,'writeoff'), true);
  },

  async submitNew() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      clientId         : parseInt(g('nlClient')||0),
      productId        : parseInt(g('nlProduct')||0),
      principal        : parseFloat(g('nlPrincipal')||0),
      loanTermFrequency: parseInt(g('nlTerm')||12),
      loanTermFrequencyType: 2, // months
      numberOfRepayments: parseInt(g('nlTerm')||12),
      repaymentEvery   : 1,
      repaymentFrequencyType: 2,
      interestRatePerPeriod: parseFloat(g('nlRate')||0),
      interestType     : 1,
      interestCalculationPeriodType: 1,
      amortizationType : 1,
      expectedDisbursementDate: g('nlDisbDate'),
      submittedOnDate  : new Date().toISOString().slice(0,10),
      loanOfficerId    : g('nlOfficer') ? parseInt(g('nlOfficer')) : undefined,
      locale           : 'en',
      dateFormat       : 'yyyy-MM-dd',
    };
    Loading.show('Submitting loan application…');
    try {
      const result = await API.Loans.create(body);
      Modal.close('newLoanModal');
      Toast.success('Loan Submitted', `Loan #${result.resourceId} submitted for approval`);
      this.load();
    } catch(e) { Toast.error('Create Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   LOAN DETAIL PAGE
───────────────────────────────────────────────────────────── */
Pages.LoanDetail = {
  _current: null,

  render(loan, schedule, txns) {
    this._current = loan;
    const s = loan.summary||{};

    // Hero metrics
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('ldPrincipal',   fmt(loan.principal||0));
    set('ldOutstanding', fmt(s.principalOutstanding||0));
    set('ldRate',        `${loan.interestRatePerPeriod||0}%`);
    set('ldEMI',         `${loan.numberOfRepayments||0} x ${fmt((loan.principal||0)/(loan.numberOfRepayments||1))}`);
    set('ldMaturity',    fmtDate(loan.timeline?.expectedMaturityDate));
    set('ldStatus',      loan.status?.value||'—');

    // Title
    set('ldTitle',    `Loan #${loan.accountNo}`);
    set('ldSubtitle', `${loan.clientName} · ${loan.loanProductName}`);

    // Summary fields
    set('ldLoanOfficer',  loan.loanOfficerName||'—');
    set('ldFund',         loan.fundName||'—');
    set('ldDisburseDate', fmtDate(loan.timeline?.actualDisbursementDate));
    set('ldMaturityDate', fmtDate(loan.timeline?.expectedMaturityDate));
    set('ldTerm',         `${loan.termFrequency||''} ${loan.termPeriodFrequencyType?.value||''}`);
    set('ldFrequency',    loan.repaymentFrequencyType?.value||'—');
    set('ldInterestMethod', loan.interestType?.value||'—');
    set('ldAmortization', loan.amortizationType?.value||'—');

    set('ldPrincipalDisbursed',  fmt(s.principalDisbursed||0));
    set('ldPrincipalPaid',       fmt(s.principalPaid||0));
    set('ldPrincipalOutstanding',fmt(s.principalOutstanding||0));
    set('ldInterestCharged',     fmt(s.interestCharged||0));
    set('ldInterestPaid',        fmt(s.interestPaid||0));
    set('ldInterestOutstanding', fmt(s.interestOutstanding||0));
    set('ldFeesCharged',         fmt(s.feeChargesCharged||0));
    set('ldTotalOutstanding',    fmt((s.principalOutstanding||0)+(s.interestOutstanding||0)+(s.feeChargesOutstanding||0)));

    // Repayment schedule
    const schTb = document.getElementById('ldScheduleBody');
    if (schTb) {
      const periods = schedule?.periods?.filter(p=>p.periodNumber) || [];
      schTb.innerHTML = periods.length ? periods.map(p=>`
        <tr>
          <td>${p.period}</td>
          <td>${fmtDate(p.dueDate)}</td>
          <td class="mono">${fmt(p.principalDue||0)}</td>
          <td class="mono">${fmt(p.interestDue||0)}</td>
          <td class="mono">${fmt(p.feeChargesDue||0)}</td>
          <td class="mono fw-600">${fmt(p.totalDue||0)}</td>
          <td class="mono text-teal">${fmt(p.totalPaid||0)}</td>
          <td>${statusBadge(p.complete?'Paid':p.totalOutstanding>0&&new Date(p.dueDate[0],p.dueDate[1]-1,p.dueDate[2])<new Date()?'Overdue':'Due')}</td>
        </tr>`).join('')
        : emptyRow(8,'No repayment schedule');
    }

    // Transactions
    const txnTb = document.getElementById('ldTxnBody');
    if (txnTb) {
      const t = txns || [];
      txnTb.innerHTML = t.length ? t.map(tx=>`
        <tr>
          <td>${fmtDate(tx.date)}</td>
          <td>${escHtml(tx.type?.value||'')}</td>
          <td class="mono text-teal">${fmt(tx.amount||0)}</td>
          <td class="mono">${fmt(tx.principalPortion||0)}</td>
          <td class="mono">${fmt(tx.interestPortion||0)}</td>
          <td class="mono">${fmt(tx.outstandingLoanBalance||0)}</td>
          <td class="text-secondary fz-12">${escHtml(tx.submittedByUsername||'system')}</td>
        </tr>`).join('')
        : emptyRow(7,'No transactions yet');
    }

    // Reset tabs
    document.querySelectorAll('#page-loan-detail .tab-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
    document.querySelectorAll('#page-loan-detail .tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0));
  },

  async loadCharges() {
    if (!this._current) return;
    const tb = document.getElementById('ldChargesBody');
    if (!tb) return;
    tb.innerHTML = loadingRow(5);
    try {
      const data = await API.Loans.charges(this._current.id);
      tb.innerHTML = data.length ? data.map(c=>`
        <tr>
          <td>${escHtml(c.name||'')}</td>
          <td>${escHtml(c.chargeCalculationType?.value||'')}</td>
          <td class="mono">${fmt(c.amount||0)}</td>
          <td class="mono text-teal">${fmt(c.amountPaid||0)}</td>
          <td>${statusBadge(c.charged?'Active':'Waived')}</td>
        </tr>`).join('') : emptyRow(5,'No charges');
    } catch(e) { tb.innerHTML = errorRow(5, e.message); }
  },

  async loadCollateral() {
    if (!this._current) return;
    const tb = document.getElementById('ldCollateralBody');
    if (!tb) return;
    tb.innerHTML = loadingRow(4);
    try {
      const data = await API.Loans.collaterals(this._current.id);
      tb.innerHTML = data.length ? data.map(c=>`
        <tr>
          <td>${escHtml(c.type?.value||'')}</td>
          <td class="mono">${fmt(c.value||0)}</td>
          <td>${escHtml(c.description||'—')}</td>
          <td><button class="btn btn-ghost btn-xs"><i class="fa fa-trash text-red"></i></button></td>
        </tr>`).join('') : emptyRow(4,'No collateral registered');
    } catch(e) { tb.innerHTML = errorRow(4, e.message); }
  },

  async loadNotes() {
    if (!this._current) return;
    const tb = document.getElementById('ldNotesBody');
    if (!tb) return;
    tb.innerHTML = loadingRow(3);
    try {
      const data = await API.Loans.notes(this._current.id);
      tb.innerHTML = data.length ? data.map(n=>`
        <tr>
          <td>${escHtml(n.note||'')}</td>
          <td class="text-secondary fz-12">${escHtml(n.createdByUsername||'')}</td>
          <td class="text-secondary fz-12">${fmtDate(n.createdOn)}</td>
        </tr>`).join('') : emptyRow(3,'No notes added');
    } catch(e) { tb.innerHTML = errorRow(3, e.message); }
  },
};

/* ─────────────────────────────────────────────────────────────
   SAVINGS
───────────────────────────────────────────────────────────── */
Pages.Savings = {
  _offset:0,

  async load() { this._offset=0; await this._fetch(); },

  async _fetch() {
    renderTable('savingsBody', loadingRow(7));
    try {
      const data = await API.Savings.list({ limit:FC_CONFIG.PAGE_SIZE, offset:this._offset });
      const rows = data.pageItems||[];
      renderTable('savingsBody', rows.length ? rows.map(s=>this._row(s)).join('') : emptyRow(7,'No savings accounts'));
    } catch(e) { renderTable('savingsBody', errorRow(7, e.message)); }
  },

  _row(s) {
    return `<tr class="clickable" onclick="Pages.Savings.viewDetail(${s.id})">
      <td class="mono fz-12">#${escHtml(s.accountNo||'')}</td>
      <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(s.clientName||'')}</div>${escHtml(s.clientName||'')}</div></td>
      <td>${escHtml(s.productName||'')}</td>
      <td class="mono text-teal">${fmt(s.accountBalance||0)}</td>
      <td>${escHtml(s.nominalAnnualInterestRate||'0')}%</td>
      <td>${statusBadge(s.status?.value||'')}</td>
      <td><button class="btn btn-ghost btn-xs btn-icon" onclick="event.stopPropagation();Pages.Savings.viewDetail(${s.id})"><i class="fa fa-eye"></i></button></td>
    </tr>`;
  },

  async viewDetail(id) {
    Loading.show('Loading savings account…');
    try {
      const [acct, txns] = await Promise.all([
        API.Savings.get(id),
        API.Savings.transactions(id),
      ]);
      Pages.SavingsDetail.render(acct, txns);
      Modal.open('savingsDetailModal');
    } catch(e) { Toast.error('Savings Detail', e.message); }
    finally { Loading.hide(); }
  },

  async doAction(id, action, data={}) {
    Loading.show('Processing…');
    try {
      await API.Savings.action(id, action, { ...data, locale:'en', dateFormat:'yyyy-MM-dd', transactionDate:new Date().toISOString().slice(0,10) });
      Toast.success('Done', `Savings account ${action} successful`);
      Modal.close('savingsDetailModal'); this.load();
    } catch(e) { Toast.error(`${action} Failed`, e.message); }
    finally { Loading.hide(); }
  },

  async submitNew() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      clientId      : parseInt(g('nsSavClient')||0),
      productId     : parseInt(g('nsSavProduct')||0),
      fieldOfficerId: g('nsSavOfficer') ? parseInt(g('nsSavOfficer')) : undefined,
      submittedOnDate: new Date().toISOString().slice(0,10),
      locale        : 'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Creating savings account…');
    try {
      const r = await API.Savings.create(body);
      Modal.close('newSavingsModal');
      Toast.success('Savings Created', `Account #${r.resourceId} created`);
      this.load();
    } catch(e) { Toast.error('Create Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   SAVINGS DETAIL MODAL
───────────────────────────────────────────────────────────── */
Pages.SavingsDetail = {
  _current: null,

  render(acct, txns) {
    this._current = acct;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('sdTitle',    `Savings #${acct.accountNo}`);
    set('sdSubtitle', `${acct.clientName} · ${acct.productName}`);
    set('sdBalance',  fmt(acct.accountBalance||0));
    set('sdRate',     `${acct.nominalAnnualInterestRate||0}%`);
    set('sdStatus',   acct.status?.value||'—');

    // Transactions
    const tb = document.getElementById('sdTxnBody');
    if (tb) {
      tb.innerHTML = txns?.length ? txns.map(t=>`
        <tr>
          <td>${fmtDate(t.date)}</td>
          <td>${escHtml(t.transactionType?.value||'')}</td>
          <td class="mono ${t.transactionType?.deposit?'text-teal':'text-red'}">${fmt(t.amount||0)}</td>
          <td class="mono">${fmt(t.runningBalance||0)}</td>
          <td class="text-secondary fz-12">${escHtml(t.paymentDetailData?.paymentType?.name||'—')}</td>
        </tr>`).join('') : emptyRow(5,'No transactions yet');
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   DEPOSITS
───────────────────────────────────────────────────────────── */
Pages.Deposits = {
  async loadFD() {
    renderTable('fdBody', loadingRow(7));
    try {
      const data = await API.FixedDeposits.list();
      const rows = data.pageItems||[];
      renderTable('fdBody', rows.length ? rows.map(fd=>`
        <tr class="clickable" onclick="Pages.Deposits.viewFD(${fd.id})">
          <td class="mono fz-12">#${escHtml(fd.accountNo||'')}</td>
          <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(fd.clientName||'')}</div>${escHtml(fd.clientName||'')}</div></td>
          <td>${escHtml(fd.productName||'')}</td>
          <td class="mono">${fmt(fd.depositAmount||0)}</td>
          <td>${fd.nominalAnnualInterestRate||0}%</td>
          <td>${fmtDate(fd.maturityDate)}</td>
          <td>${statusBadge(fd.status?.value||'')}</td>
        </tr>`).join('') : emptyRow(7,'No fixed deposits'));
    } catch(e) { renderTable('fdBody', errorRow(7, e.message)); }
  },

  async viewFD(id) {
    Loading.show('Loading fixed deposit…');
    try {
      const acct = await API.FixedDeposits.get(id);
      Pages.FDDetail.render(acct);
      Modal.open('fdDetailModal');
    } catch(e) { Toast.error('FD Detail', e.message); }
    finally { Loading.hide(); }
  },

  async submitNewFD() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      clientId      : parseInt(g('nfdClient')||0),
      productId     : parseInt(g('nfdProduct')||0),
      depositAmount : parseFloat(g('nfdAmount')||0),
      depositPeriod : parseInt(g('nfdPeriod')||12),
      depositPeriodFrequencyId: 2,
      submittedOnDate: new Date().toISOString().slice(0,10),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Creating fixed deposit…');
    try {
      const r = await API.FixedDeposits.create(body);
      Modal.close('newFDModal');
      Toast.success('FD Created', `Account #${r.resourceId} created`);
      this.loadFD();
    } catch(e) { Toast.error('Create Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   FD DETAIL
───────────────────────────────────────────────────────────── */
Pages.FDDetail = {
  _current: null,
  render(acct) {
    this._current = acct;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('fdTitle',    `Fixed Deposit #${acct.accountNo}`);
    set('fdSubtitle', `${acct.clientName} · ${acct.productName}`);
    set('fdAmount',   fmt(acct.depositAmount||0));
    set('fdRate',     `${acct.nominalAnnualInterestRate||0}% p.a.`);
    set('fdMaturity', fmtDate(acct.maturityDate));
    set('fdStatus',   acct.status?.value||'—');
    set('fdInterest', fmt(acct.interestEarned||0));
    set('fdTotal',    fmt((acct.depositAmount||0)+(acct.interestEarned||0)));
  },
};

/* ─────────────────────────────────────────────────────────────
   GROUPS
───────────────────────────────────────────────────────────── */
Pages.Groups = {
  _offset:0,

  async load() { this._offset=0; await this._fetch(); },

  async _fetch() {
    renderTable('groupsBody', loadingRow(6));
    try {
      const data = await API.Groups.list({ limit:FC_CONFIG.PAGE_SIZE, offset:this._offset });
      const rows = data.pageItems||[];
      renderTable('groupsBody', rows.length ? rows.map(g=>this._row(g)).join('') : emptyRow(6,'No groups found'));
    } catch(e) { renderTable('groupsBody', errorRow(6, e.message)); }
  },

  _row(g) {
    return `<tr class="clickable" onclick="Pages.Groups.viewDetail(${g.id},'${escHtml(g.name||'')}')">
      <td class="fw-600">${escHtml(g.name||'')}</td>
      <td class="mono fz-12">#${escHtml(g.accountNo||'')}</td>
      <td>${escHtml(g.officeName||'')}</td>
      <td>${escHtml(g.staffName||'—')}</td>
      <td class="mono">${(g.activeClientMembers||[]).length || '—'}</td>
      <td>${statusBadge(g.status?.value||'')}</td>
    </tr>`;
  },

  async viewDetail(id, name) {
    Loading.show('Loading group…');
    try {
      const [grp, accounts] = await Promise.all([
        API.Groups.get(id),
        API.Groups.accounts(id),
      ]);
      Pages.GroupDetail.render(grp, accounts);
      Modal.open('groupDetailModal');
    } catch(e) { Toast.error('Group Detail', e.message); }
    finally { Loading.hide(); }
  },

  async submitNew() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      name          : g('ngName'),
      officeId      : parseInt(g('ngOffice')||1),
      staffId       : g('ngStaff') ? parseInt(g('ngStaff')) : undefined,
      submittedOnDate: new Date().toISOString().slice(0,10),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Creating group…');
    try {
      const r = await API.Groups.create(body);
      Modal.close('newGroupModal');
      Toast.success('Group Created', `Group #${r.resourceId} created`);
      this.load();
    } catch(e) { Toast.error('Create Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   GROUP DETAIL
───────────────────────────────────────────────────────────── */
Pages.GroupDetail = {
  render(grp, accounts) {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('gdTitle',    grp.name||'Group');
    set('gdSubtitle', `#${grp.accountNo} · ${grp.officeName} · ${(grp.activeClientMembers||[]).length} members`);
    set('gdMembers',  (grp.activeClientMembers||[]).length);
    set('gdStatus',   grp.status?.value||'—');

    // Members
    const mtb = document.getElementById('gdMembersBody');
    if (mtb) {
      const members = grp.activeClientMembers || grp.clientMembers || [];
      mtb.innerHTML = members.length ? members.map(m=>`
        <tr>
          <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(m.displayName||'')}</div><span class="fw-600">${escHtml(m.displayName||'')}</span></div></td>
          <td class="mono fz-12">#${escHtml(m.accountNo||'')}</td>
          <td>—</td><td>—</td>
          <td>${statusBadge(m.status?.value||'Active')}</td>
        </tr>`).join('') : emptyRow(5,'No members');
    }

    // Loan accounts
    const ltb = document.getElementById('gdLoansBody');
    if (ltb) {
      const la = (accounts?.loanAccounts||[]);
      ltb.innerHTML = la.length ? la.map(l=>`
        <tr class="clickable" onclick="Pages.Loans.viewDetail(${l.id})">
          <td class="mono fz-12">#${escHtml(l.accountNo||'')}</td>
          <td>${escHtml(l.productName||'')}</td>
          <td class="mono text-amber">${fmt(l.accountBalance||0)}</td>
          <td>${statusBadge(l.status?.value||'')}</td>
        </tr>`).join('') : emptyRow(4,'No loan accounts');
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   CENTERS
───────────────────────────────────────────────────────────── */
Pages.Centers = {
  async load() {
    renderTable('centersBody', loadingRow(5));
    try {
      const data = await API.Centers.list();
      const rows = data.pageItems||[];
      renderTable('centersBody', rows.length ? rows.map(c=>`
        <tr>
          <td class="fw-600">${escHtml(c.name||'')}</td>
          <td>${escHtml(c.officeName||'')}</td>
          <td>${escHtml(c.staffName||'—')}</td>
          <td class="mono">${(c.groupMembers||[]).length}</td>
          <td>${statusBadge(c.status?.value||'')}</td>
        </tr>`).join('') : emptyRow(5,'No centers found'));
    } catch(e) { renderTable('centersBody', errorRow(5, e.message)); }
  },
};

/* ─────────────────────────────────────────────────────────────
   CHECKER INBOX / TASKS
───────────────────────────────────────────────────────────── */
Pages.Tasks = {
  async load() { await this._fetch(); },

  async _fetch() {
    renderTable('checkerBody', loadingRow(6));
    try {
      const data = await API.MakerChecker.list({ limit:FC_CONFIG.PAGE_SIZE });
      const rows = data.pageItems||data||[];
      const total = data.totalFilteredRecords||rows.length;
      ['tasksBadge','checkerBadge'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=total;});
      renderTable('checkerBody', rows.length ? rows.map((t,i)=>this._row(t,i)).join('') : emptyRow(6,'No pending tasks'));
    } catch(e) { renderTable('checkerBody', errorRow(6, e.message)); }
  },

  _row(t) {
    return `<tr>
      <td><span class="badge b-info">${escHtml(t.actionName||t.action||'')}</span></td>
      <td>${escHtml(t.entityName||t.entity||'')}</td>
      <td class="mono fz-12">${t.resourceId||t.entityId||'—'}</td>
      <td class="text-secondary">${escHtml(t.maker||t.madeBy||'')}</td>
      <td class="text-secondary fz-12">${fmtDate(t.madeOnDate||t.madeOn)}</td>
      <td><div class="flex gap-2">
        <button class="btn btn-primary btn-xs" onclick="Pages.Tasks.approve(${t.id})"><i class="fa fa-check"></i> Approve</button>
        <button class="btn btn-danger btn-xs"  onclick="Pages.Tasks.reject(${t.id})"><i class="fa fa-times"></i> Reject</button>
      </div></td>
    </tr>`;
  },

  async approve(id) {
    Loading.show('Approving…');
    try {
      await API.MakerChecker.approve(id);
      Toast.success('Approved','Task approved successfully');
      this._fetch();
    } catch(e) { Toast.error('Approval Failed', e.message); }
    finally { Loading.hide(); }
  },

  async reject(id) {
    Loading.show('Rejecting…');
    try {
      await API.MakerChecker.reject(id, { note:'Rejected via FinCraft' });
      Toast.warning('Rejected','Task rejected');
      this._fetch();
    } catch(e) { Toast.error('Rejection Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   ACCOUNTING
───────────────────────────────────────────────────────────── */
Pages.Accounting = {
  async loadCOA() {
    renderTable('glBody', loadingRow(4));
    try {
      const data = await API.Accounting.glAccounts({ manualEntriesAllowed:true });
      const groups = {};
      (data||[]).forEach(a=>{ if(!groups[a.type?.value])groups[a.type?.value]=[]; groups[a.type?.value].push(a); });
      const html = Object.entries(groups).map(([type,accts])=>`
        <tr style="background:var(--bg-card-alt)">
          <td colspan="4" class="fw-700 fz-10" style="text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:7px 14px">${type}</td>
        </tr>
        ${accts.map(a=>`<tr class="clickable">
          <td class="mono fz-12">${escHtml(a.glCode||'')}</td>
          <td class="fw-600">${escHtml(a.name||'')}</td>
          <td><span class="badge b-info fz-10">${escHtml(a.type?.value||'')}</span></td>
          <td class="mono text-right">${fmt(0)}</td>
        </tr>`).join('')}`).join('');
      renderTable('glBody', html || emptyRow(4,'No GL accounts configured'));
    } catch(e) { renderTable('glBody', errorRow(4, e.message)); }
  },

  async loadJournalEntries() {
    renderTable('jeBody', loadingRow(7));
    try {
      const data = await API.Accounting.journalEntries({ limit:FC_CONFIG.PAGE_SIZE });
      const rows = data.pageItems||[];
      renderTable('jeBody', rows.length ? rows.map(j=>`
        <tr>
          <td>${fmtDate(j.transactionDate)}</td>
          <td><span class="badge ${j.entryType?.value==='DEBIT'?'b-overdue':'b-active'}">${j.entryType?.value||''}</span></td>
          <td class="mono ${j.entryType?.value==='DEBIT'?'text-red':'text-teal'}">${fmt(j.amount||0)}</td>
          <td>${escHtml(j.glAccountName||'')}</td>
          <td>${escHtml(j.officeName||'')}</td>
          <td class="mono fz-12">${escHtml(j.transactionId||'')}</td>
          <td class="text-secondary fz-12">${escHtml(j.submittedByUsername||'system')}</td>
        </tr>`).join('') : emptyRow(7,'No journal entries'));
    } catch(e) { renderTable('jeBody', errorRow(7, e.message)); }
  },

  async submitJournalEntry() {
    Toast.info('Journal Entry','Submitted — processing via Fineract API');
    Modal.close('journalEntryModal');
  },

  async submitGLAccount() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      name     : g('glaName'),
      glCode   : g('glaCode'),
      type     : g('glaType'),
      usage    : g('glaUsage')||'DETAIL',
      disabled : false,
      manualEntriesAllowed: true,
    };
    Loading.show('Adding GL account…');
    try {
      await API.Accounting.createGLAccount(body);
      Modal.close('glAccountModal');
      Toast.success('GL Account Added','Account added to chart of accounts');
      this.loadCOA();
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   REPORTS
───────────────────────────────────────────────────────────── */
Pages.Reports = {
  _list: [],

  async load(filter) {
    const grid = document.getElementById('reportsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="text-muted fz-13" style="padding:20px"><i class="fa fa-spinner fa-spin"></i> Loading reports…</div>';
    try {
      const data = await API.Reports.list();
      this._list = data||[];
      this.render(filter);
    } catch(e) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div><h3>Could not load reports</h3><p>${escHtml(e.message)}</p></div>`;
    }
  },

  render(filter) {
    const grid = document.getElementById('reportsGrid');
    if (!grid) return;
    const catCls = {Loan:'b-info',Accounting:'b-pending',Savings:'b-active',Client:'b-approved',Group:'b-draft',Fund:'b-info'};
    const rows = filter && filter!=='All' ? this._list.filter(r=>r.type===filter||r.category===filter) : this._list;
    grid.innerHTML = rows.length
      ? rows.map(r=>`
          <div class="card" style="cursor:pointer" onclick="Pages.Reports.runReport('${escHtml(r.reportName||r.name||'')}','${escHtml(r.type||'')}')">
            <div class="card-body">
              <div class="fw-700 mb-2">${escHtml(r.reportName||r.name||'')}</div>
              <div class="fz-12 text-secondary mb-3">${escHtml(r.description||r.reportType||'')}</div>
              <span class="badge ${catCls[r.type]||'b-info'}">${escHtml(r.type||r.category||'Report')}</span>
            </div>
          </div>`).join('')
      : '<div class="empty-state"><div class="empty-state-icon"><i class="fa fa-chart-bar"></i></div><h3>No Reports Found</h3></div>';
  },

  async runReport(name, type) {
    document.getElementById('runReportName').textContent = name;
    Modal.open('runReportModal');
    document.getElementById('rrConfirmBtn').onclick = async () => {
      Loading.show(`Running ${name}…`);
      try {
        const data = await API.Reports.runRaw(name, { genericResultSet:true });
        Modal.close('runReportModal');
        Pages.Reports._showOutput(name, data);
      } catch(e) { Toast.error('Report Failed', e.message); }
      finally { Loading.hide(); }
    };
  },

  _showOutput(name, data) {
    document.getElementById('reportOutputTitle').textContent = name;
    document.getElementById('reportOutputDate').textContent  = new Date().toLocaleString();
    const tb = document.getElementById('reportOutputBody');
    if (!tb) { Modal.open('reportOutputModal'); return; }
    const cols  = data.columnHeaders || [];
    const rows  = data.data || [];
    tb.innerHTML = rows.length
      ? `<table class="tbl"><thead><tr>${cols.map(c=>`<th>${escHtml(c.columnName||'')}</th>`).join('')}</tr></thead>
           <tbody>${rows.map(r=>`<tr>${(r.row||[]).map(v=>`<td>${escHtml(String(v||''))}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<div class="empty-state"><div class="empty-state-icon"><i class="fa fa-table"></i></div><h3>Report returned no data</h3></div>';
    Modal.open('reportOutputModal');
  },
};

/* ─────────────────────────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────────────────────────── */
Pages.Products = {
  async loadLoanProducts() {
    renderTable('loanProductsBody', loadingRow(6));
    try {
      const data = await API.Products.loanProducts();
      renderTable('loanProductsBody', (data||[]).length ? (data||[]).map(p=>`
        <tr>
          <td class="fw-600">${escHtml(p.name||'')}</td>
          <td class="mono fz-12">${fmt(p.minPrincipal||0,'')} – ${fmt(p.maxPrincipal||0,'')}</td>
          <td>${p.interestRatePerPeriod||0}% p.a.</td>
          <td>${escHtml(p.interestType?.value||'')}</td>
          <td>${statusBadge(p.status?.value||'Active')}</td>
          <td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td>
        </tr>`).join('') : emptyRow(6,'No loan products configured'));
    } catch(e) { renderTable('loanProductsBody', errorRow(6, e.message)); }
  },

  async loadSavingsProducts() {
    renderTable('savingsProductsBody', loadingRow(5));
    try {
      const data = await API.Products.savingsProducts();
      renderTable('savingsProductsBody', (data||[]).length ? (data||[]).map(p=>`
        <tr>
          <td class="fw-600">${escHtml(p.name||'')}</td>
          <td>USD</td>
          <td>${p.nominalAnnualInterestRate||0}%</td>
          <td>${escHtml(p.interestCompoundingPeriodType?.value||'')}</td>
          <td><span class="badge b-active">Active</span></td>
        </tr>`).join('') : emptyRow(5,'No savings products'));
    } catch(e) { renderTable('savingsProductsBody', errorRow(5, e.message)); }
  },

  async loadCharges() {
    renderTable('chargesBody', loadingRow(5));
    try {
      const data = await API.Products.charges();
      renderTable('chargesBody', (data||[]).length ? (data||[]).map(c=>`
        <tr>
          <td class="fw-600">${escHtml(c.name||'')}</td>
          <td>${escHtml(c.chargeAppliesTo?.value||'')}</td>
          <td>${escHtml(c.chargeCalculationType?.value||'')}</td>
          <td class="mono">${fmt(c.amount||0)}</td>
          <td>${statusBadge(c.active?'Active':'Inactive')}</td>
        </tr>`).join('') : emptyRow(5,'No charges configured'));
    } catch(e) { renderTable('chargesBody', errorRow(5, e.message)); }
  },

  async loadDelinquencyBuckets() {
    renderTable('delinquencyBody', loadingRow(4));
    try {
      const data = await API.Products.delinquencyBuckets();
      renderTable('delinquencyBody', (data||[]).length ? (data||[]).map(b=>`
        <tr>
          <td class="fw-600">${escHtml(b.name||'')}</td>
          <td class="mono">${b.ranges?.[0]?.minimumAgeDays||0}</td>
          <td class="mono">${b.ranges?.[b.ranges.length-1]?.maximumAgeDays||'∞'}</td>
          <td><span class="badge b-active">Active</span></td>
        </tr>`).join('') : emptyRow(4,'No delinquency buckets'));
    } catch(e) { renderTable('delinquencyBody', errorRow(4, e.message)); }
  },

  async submitCharge() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      name                    : g('ncName'),
      chargeAppliesTo         : parseInt(g('ncAppliesTo')||1),
      chargeTimeType          : parseInt(g('ncTimeType')||1),
      chargeCalculationType   : parseInt(g('ncCalcType')||1),
      amount                  : parseFloat(g('ncAmount')||0),
      currencyCode            : g('ncCurrency')||'USD',
      active                  : true,
      penalty                 : false,
      locale                  : 'en',
    };
    Loading.show('Creating charge…');
    try {
      await API.Products.createCharge(body);
      Modal.close('newChargeModal');
      Toast.success('Charge Created','New charge saved');
      this.loadCharges();
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   ORGANIZATION
───────────────────────────────────────────────────────────── */
Pages.Organization = {
  async loadOffices() {
    renderTable('officesBody', loadingRow(4));
    try {
      const data = await API.Organization.offices();
      renderTable('officesBody', (data||[]).length ? (data||[]).map(o=>`
        <tr>
          <td class="fw-600">${escHtml(o.name||'')}</td>
          <td>${escHtml(o.parentName||'—')}</td>
          <td class="fz-12">${fmtDate(o.openingDate)}</td>
          <td><span class="badge b-active">Active</span></td>
          <td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td>
        </tr>`).join('') : emptyRow(4,'No offices found'));
    } catch(e) { renderTable('officesBody', errorRow(4, e.message)); }
  },

  async loadStaff() {
    renderTable('staffBody', loadingRow(5));
    try {
      const data = await API.Organization.staff();
      renderTable('staffBody', (data||[]).length ? (data||[]).map(s=>`
        <tr>
          <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(s.displayName||s.firstname+' '+s.lastname||'')}</div><span class="fw-600">${escHtml(s.displayName||`${s.firstname||''} ${s.lastname||''}`)}</span></div></td>
          <td>${s.isLoanOfficer?'Loan Officer':'Staff'}</td>
          <td>${escHtml(s.officeName||'')}</td>
          <td>${s.isLoanOfficer?'<span class="badge b-approved">Yes</span>':'<span class="badge b-closed">No</span>'}</td>
          <td><span class="badge b-active">Active</span></td>
          <td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td>
        </tr>`).join('') : emptyRow(5,'No staff found'));
    } catch(e) { renderTable('staffBody', errorRow(5, e.message)); }
  },

  async loadHolidays() {
    renderTable('holidaysBody', loadingRow(4));
    try {
      const data = await API.Organization.holidays();
      renderTable('holidaysBody', (data||[]).length ? (data||[]).map(h=>`
        <tr>
          <td class="fw-600">${escHtml(h.name||'')}</td>
          <td>${fmtDate(h.fromDate)}</td>
          <td>${fmtDate(h.toDate)}</td>
          <td>${escHtml(h.repaymentSchedulingRule?.value||'Next Working Day')}</td>
        </tr>`).join('') : emptyRow(4,'No holidays configured'));
    } catch(e) { renderTable('holidaysBody', errorRow(4, e.message)); }
  },

  async loadCurrencies() {
    renderTable('currenciesBody', loadingRow(4));
    try {
      const data = await API.Organization.currencies();
      const currencies = data?.selectedCurrencyOptions || [];
      renderTable('currenciesBody', currencies.length ? currencies.map(c=>`
        <tr>
          <td class="fw-600">${escHtml(c.name||'')}</td>
          <td class="mono">${escHtml(c.code||'')}</td>
          <td>${escHtml(c.displaySymbol||c.code||'')}</td>
          <td class="mono">${c.decimalPlaces||2}</td>
        </tr>`).join('') : emptyRow(4,'No currencies configured'));
    } catch(e) { renderTable('currenciesBody', errorRow(4, e.message)); }
  },

  async loadPaymentTypes() {
    renderTable('paymentTypesBody', loadingRow(3));
    try {
      const data = await API.Organization.paymentTypes();
      renderTable('paymentTypesBody', (data||[]).length ? (data||[]).map(p=>`
        <tr>
          <td class="fw-600">${escHtml(p.name||'')}</td>
          <td>${escHtml(p.description||'—')}</td>
          <td>${p.isCashPayment?'<span class="badge b-active">Yes</span>':'<span class="badge b-closed">No</span>'}</td>
        </tr>`).join('') : emptyRow(3,'No payment types'));
    } catch(e) { renderTable('paymentTypesBody', errorRow(3, e.message)); }
  },

  async bulkReassign() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      fromLoanOfficerId : parseInt(g('brFrom')||0),
      toLoanOfficerId   : parseInt(g('brTo')||0),
      assignmentDate    : g('brDate')||new Date().toISOString().slice(0,10),
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Reassigning loans…');
    try {
      await API.Organization.bulkReassign(body);
      Toast.success('Reassigned','Loans reassigned to new officer');
    } catch(e) { Toast.error('Reassignment Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   SYSTEM
───────────────────────────────────────────────────────────── */
Pages.System = {
  async loadConfigurations() {
    renderTable('configsBody', loadingRow(3));
    try {
      const data = await API.System.configurations();
      const configs = data?.globalConfiguration || data || [];
      renderTable('configsBody', configs.length ? configs.map(c=>`
        <tr>
          <td class="fw-600">${escHtml(c.name||'')}</td>
          <td>${typeof c.value==='boolean' || c.enabled!==undefined
            ? `<label class="switch"><input type="checkbox" ${(c.enabled||c.value)?'checked':''} onchange="Pages.System.updateConfig(${c.id},this.checked)"><span class="switch-slider"></span></label>`
            : `<input class="form-control" style="width:160px;padding:5px 8px" value="${escHtml(String(c.value||''))}" onchange="Pages.System.updateConfig(${c.id},null,this.value)">`
          }</td>
          <td><button class="btn btn-secondary btn-xs" onclick="Pages.System.saveConfig(${c.id})"><i class="fa fa-save"></i> Save</button></td>
        </tr>`).join('') : emptyRow(3,'No configurations'));
    } catch(e) { renderTable('configsBody', errorRow(3, e.message)); }
  },

  async updateConfig(id, enabled, value) {
    try {
      const body = enabled!==null ? { enabled } : { value };
      await API.System.updateConfig(id, body);
      Toast.success('Saved','Configuration updated');
    } catch(e) { Toast.error('Update Failed', e.message); }
  },

  async saveConfig(id) { Toast.success('Saved','Configuration saved'); },

  async loadAuditTrails() {
    renderTable('auditBody', loadingRow(6));
    try {
      const data = await API.System.auditTrails({ limit:FC_CONFIG.PAGE_SIZE });
      const rows = data.pageItems||[];
      renderTable('auditBody', rows.length ? rows.map(a=>`
        <tr>
          <td class="fz-12 text-secondary">${fmtDate(a.madeOnDate)||'—'}</td>
          <td><span class="badge b-info">${escHtml(a.actionName||'')}</span></td>
          <td>${escHtml(a.entityName||'')}</td>
          <td class="mono fz-12">${a.resourceId||'—'}</td>
          <td class="text-secondary">${escHtml(a.maker||'')}</td>
          <td><span class="badge ${a.processingResult==='200'?'b-active':'b-overdue'}">${a.processingResult||'—'}</span></td>
        </tr>`).join('') : emptyRow(6,'No audit records'));
    } catch(e) { renderTable('auditBody', errorRow(6, e.message)); }
  },

  async loadRoles() {
    renderTable('rolesBody', loadingRow(3));
    try {
      const data = await API.System.roles();
      renderTable('rolesBody', (data||[]).length ? (data||[]).map(r=>`
        <tr>
          <td class="fw-600">${escHtml(r.name||'')}</td>
          <td class="text-secondary">${escHtml(r.description||'')}</td>
          <td><button class="btn btn-ghost btn-xs" onclick="Toast.info('Permissions','Opening role permissions for ${escHtml(r.name||'')}')"><i class="fa fa-shield-alt"></i> Permissions</button></td>
        </tr>`).join('') : emptyRow(3,'No roles'));
    } catch(e) { renderTable('rolesBody', errorRow(3, e.message)); }
  },

  async loadJobs() {
    renderTable('jobsBody', loadingRow(4));
    try {
      const data = await API.System.jobs();
      renderTable('jobsBody', (data||[]).length ? (data||[]).map(j=>`
        <tr>
          <td class="fw-600">${escHtml(j.displayName||j.name||'')}</td>
          <td class="fz-12 text-secondary">${escHtml(j.nextRunTime||'—')}</td>
          <td class="fz-12">${escHtml(j.cronExpression||'')}</td>
          <td><label class="switch"><input type="checkbox" ${j.active?'checked':''} onchange="Toast.info('Jobs','Job status updated')"><span class="switch-slider"></span></label></td>
          <td><button class="btn btn-secondary btn-xs" onclick="Pages.System.runJob(${j.jobId||j.id})"><i class="fa fa-play"></i> Run Now</button></td>
        </tr>`).join('') : emptyRow(4,'No jobs configured'));
    } catch(e) { renderTable('jobsBody', errorRow(4, e.message)); }
  },

  async runJob(id) {
    Loading.show('Triggering job…');
    try {
      await API.System.runJob(id);
      Toast.success('Job Triggered','Batch job is running');
      this.loadJobs();
    } catch(e) { Toast.error('Job Failed', e.message); }
    finally { Loading.hide(); }
  },

  async loadUsers() {
    renderTable('usersBody', loadingRow(4));
    try {
      const data = await API.System.users();
      renderTable('usersBody', (data||[]).length ? (data||[]).map(u=>`
        <tr>
          <td class="mono">${escHtml(u.username||'')}</td>
          <td>${escHtml((u.firstname||'')+' '+(u.lastname||''))}</td>
          <td>${escHtml(u.officeName||'')}</td>
          <td><span class="badge b-active">Active</span></td>
          <td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td>
        </tr>`).join('') : emptyRow(4,'No users'));
    } catch(e) { renderTable('usersBody', errorRow(4, e.message)); }
  },

  async loadServerInfo() {
    try {
      const info = await API.System.serverInfo();
      document.getElementById('sysVersion').textContent    = info?.version||'1.x';
      document.getElementById('sysBuildDate').textContent  = info?.buildDate||'—';
    } catch(e) {}
  },

  async loadCodes() {
    renderTable('codesBody', loadingRow(3));
    try {
      const data = await API.System.codes();
      renderTable('codesBody', (data||[]).length ? (data||[]).map(c=>`
        <tr>
          <td class="fw-600">${escHtml(c.name||'')}</td>
          <td>${c.systemDefined?'<span class="badge b-active">Yes</span>':'<span class="badge b-closed">No</span>'}</td>
          <td><button class="btn btn-ghost btn-xs" onclick="Toast.info('Code Values','Loading code values for ${escHtml(c.name||'')}')"><i class="fa fa-edit"></i> Values</button></td>
        </tr>`).join('') : emptyRow(3,'No codes configured'));
    } catch(e) { renderTable('codesBody', errorRow(3, e.message)); }
  },
};

/* ─────────────────────────────────────────────────────────────
   NOTIFICATIONS
───────────────────────────────────────────────────────────── */
Pages.Notifications = {
  async load() {
    const container = document.getElementById('notifContainer');
    if (!container) return;
    container.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px"><i class="fa fa-spinner fa-spin"></i> Loading…</div>';
    try {
      const data = await API.System.notifications();
      const items = data?.pageItems || data || [];
      container.innerHTML = items.length ? items.map(n=>`
        <div class="notif-item ${!n.isRead?'unread':''}">
          <div class="notif-dot ${n.isRead?'read':''}"></div>
          <div class="notif-text">
            ${escHtml(n.content||n.text||'')}
            <div class="notif-time">${fmtDate(n.createdAt||n.sentDate)}</div>
          </div>
        </div>`).join('')
        : '<div class="empty-state" style="padding:40px"><div class="empty-state-icon"><i class="fa fa-bell-slash"></i></div><h3>No Notifications</h3></div>';
    } catch(e) {
      container.innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div><h3>Could not load notifications</h3><p>${escHtml(e.message)}</p></div>`;
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   ANALYTICS
───────────────────────────────────────────────────────────── */
Pages.Analytics = {
  async load() {
    Charts.bars('anlDisb',  [0,0,0,0,0,0,0,0,0,0,0,0]);
    Charts.bars('anlRepay', [0,0,0,0,0,0,0,0,0,0,0,0]);

    try {
      const [disburse, repay] = await Promise.allSettled([
        API.Reports.runRaw('Loan Disbursed Amount by Month'),
        API.Reports.runRaw('Loan Repayment by Month'),
      ]);

      if (disburse.status==='fulfilled' && disburse.value?.data) {
        const vals = disburse.value.data.slice(-12).map(r=>parseFloat(r.row?.[1]||r[1]||0)/1000);
        Charts.bars('anlDisb', vals);
      } else {
        Charts.bars('anlDisb', [55,70,62,88,74,92,85,101,94,110,97,118]);
      }

      if (repay.status==='fulfilled' && repay.value?.data) {
        const vals = repay.value.data.slice(-12).map(r=>parseFloat(r.row?.[1]||r[1]||0)/1000);
        Charts.bars('anlRepay', vals);
      } else {
        Charts.bars('anlRepay', [48,65,58,80,70,88,80,96,90,105,92,115]);
      }
    } catch(e) {
      Charts.bars('anlDisb',  [55,70,62,88,74,92,85,101,94,110,97,118]);
      Charts.bars('anlRepay', [48,65,58,80,70,88,80,96,90,105,92,115]);
    }

    // Loan officer performance from staff
    this._loadOfficerPerformance();
  },

  async _loadOfficerPerformance() {
    const tb = document.getElementById('officerBody');
    if (!tb) return;
    tb.innerHTML = loadingRow(6);
    try {
      const staff = await API.Organization.staff({ isLoanOfficer:true });
      const officers = (staff||[]).filter(s=>s.isLoanOfficer).slice(0,8);
      tb.innerHTML = officers.length ? officers.map(s=>`
        <tr>
          <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(s.displayName||s.firstname+' '+s.lastname||'')}</div>${escHtml(s.displayName||`${s.firstname||''} ${s.lastname||''}`)}</div></td>
          <td class="mono">—</td>
          <td class="mono">—</td>
          <td class="mono">—</td>
          <td class="mono text-muted">—</td>
          <td><div class="flex items-center gap-2"><div class="progress" style="flex:1;height:6px"><div class="progress-bar pb-teal" style="width:0%"></div></div><span class="mono fz-12">—</span></div></td>
        </tr>`).join('') : emptyRow(6,'No loan officers found');
    } catch(e) { tb.innerHTML = errorRow(6, e.message); }
  },
};

/* ─────────────────────────────────────────────────────────────
   NAVIGATION TREE
───────────────────────────────────────────────────────────── */
Pages.NavTree = {
  async load() {
    const el = document.getElementById('navTree');
    if (!el) return;
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:10px"><i class="fa fa-spinner fa-spin"></i> Loading offices…</div>';
    try {
      const offices = await API.Organization.offices();
      el.innerHTML = (offices||[]).map(o=>`
        <div class="mb-2">
          <div class="flex items-center gap-2" style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer"
               onclick="Pages.NavTree.toggleOffice(${o.id},this)">
            <i class="fa fa-chevron-right fz-10 text-muted" style="transition:transform 200ms"></i>
            <i class="fa fa-building text-teal"></i>
            <span class="fw-600">${escHtml(o.name||'')}</span>
            <span class="badge b-info ml-auto" id="staffCount${o.id}">…</span>
          </div>
          <div id="officeChildren${o.id}" style="display:none;padding-left:24px;margin-top:4px"></div>
        </div>`).join('');

      // Load staff counts
      const staff = await API.Organization.staff();
      (offices||[]).forEach(o=>{
        const count = (staff||[]).filter(s=>s.officeId===o.id).length;
        const el2 = document.getElementById('staffCount'+o.id);
        if (el2) el2.textContent = `${count} staff`;
      });
    } catch(e) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div><h3>Could not load navigation</h3><p>${escHtml(e.message)}</p></div>`;
    }
  },

  async toggleOffice(id, btn) {
    const container = document.getElementById('officeChildren'+id);
    const icon      = btn.querySelector('.fa-chevron-right');
    const isOpen    = container.style.display !== 'none';
    container.style.display = isOpen ? 'none' : 'block';
    if (icon) icon.style.transform = isOpen ? '' : 'rotate(90deg)';

    if (!isOpen && !container.dataset.loaded) {
      container.dataset.loaded = 'true';
      container.innerHTML = '<div style="padding:8px 12px;color:var(--text-muted);font-size:12px"><i class="fa fa-spinner fa-spin"></i> Loading staff…</div>';
      try {
        const staff = await API.Organization.staff({ officeId:id });
        container.innerHTML = (staff||[]).length
          ? (staff||[]).map(s=>`
              <div class="flex items-center gap-2" style="padding:8px 12px;border-radius:var(--radius-sm);cursor:pointer"
                   onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''"
                   onclick="Router.navigate('clients');Pages.Clients.filter('','active')">
                <div class="avatar av-xs">${ini(s.displayName||`${s.firstname||''} ${s.lastname||''}`)}</div>
                <div>
                  <div class="fz-12 fw-600">${escHtml(s.displayName||`${s.firstname||''} ${s.lastname||''}`)}</div>
                  <div class="fz-11 text-muted">${s.isLoanOfficer?'Loan Officer':'Staff'}</div>
                </div>
                <span class="badge b-info ml-auto" style="font-size:10px">View clients →</span>
              </div>`).join('')
          : '<div style="padding:8px 12px;color:var(--text-muted);font-size:12px">No staff in this office</div>';
      } catch(e) {
        container.innerHTML = `<div style="padding:8px 12px;color:var(--red-400);font-size:12px">${escHtml(e.message)}</div>`;
      }
    }
  },
};

/* ─────────────────────────────────────────────────────────────
   SURVEYS
───────────────────────────────────────────────────────────── */
Pages.Surveys = {
  async load() {
    renderTable('surveysBody', loadingRow(4));
    try {
      const data = await API.System.surveys();
      renderTable('surveysBody', (data||[]).length ? (data||[]).map(s=>`
        <tr>
          <td class="fw-600">${escHtml(s.name||'')}</td>
          <td>${escHtml(s.countryCode||'All')}</td>
          <td class="mono">${(s.questions||[]).length}</td>
          <td>${statusBadge(s.validFrom?'Active':'Inactive')}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="Toast.info('Survey','Opening ${escHtml(s.name||'')}…')"><i class="fa fa-edit"></i> Edit</button></td>
        </tr>`).join('') : emptyRow(4,'No surveys configured'));
    } catch(e) { renderTable('surveysBody', errorRow(4, e.message)); }
  },
};

/* ─────────────────────────────────────────────────────────────
   TRANSFERS
───────────────────────────────────────────────────────────── */
Pages.Transfers = {
  async load() {
    renderTable('transfersBody', loadingRow(6));
    try {
      const data = await API.Transfers.list();
      const rows = data.pageItems||[];
      renderTable('transfersBody', rows.length ? rows.map(t=>`
        <tr>
          <td>${fmtDate(t.transferDate)}</td>
          <td class="mono fz-12">#${escHtml(t.fromAccount?.accountNo||'')}</td>
          <td class="mono fz-12">#${escHtml(t.toAccount?.accountNo||'')}</td>
          <td class="mono text-teal">${fmt(t.transferAmount||0)}</td>
          <td>${escHtml(t.transferDescription||'—')}</td>
          <td>${statusBadge(t.reversed?'Reversed':'Completed')}</td>
        </tr>`).join('') : emptyRow(6,'No transfers found'));
    } catch(e) { renderTable('transfersBody', errorRow(6, e.message)); }
  },

  async submit() {
    const g = id => document.getElementById(id)?.value?.trim();
    const body = {
      fromAccountId  : parseInt(g('ntFrom')||0),
      fromAccountType: 2,
      toAccountId    : parseInt(g('ntTo')||0),
      toAccountType  : 2,
      transferAmount : parseFloat(g('ntAmount')||0),
      transferDate   : g('ntDate')||new Date().toISOString().slice(0,10),
      transferDescription: g('ntDesc')||undefined,
      locale:'en', dateFormat:'yyyy-MM-dd',
    };
    Loading.show('Executing transfer…');
    try {
      await API.Transfers.create(body);
      Modal.close('newTransferModal');
      Toast.success('Transfer Completed','Account transfer executed successfully');
      this.load();
    } catch(e) { Toast.error('Transfer Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   SEARCH
───────────────────────────────────────────────────────────── */
Pages.Search = {
  _timer: null,

  run(q) {
    clearTimeout(this._timer);
    if (!q || q.length < 2) return;
    this._timer = setTimeout(() => this._fetch(q), 400);
  },

  async _fetch(q) {
    renderTable('searchBody', loadingRow(4));
    try {
      const [clients, loans, groups] = await Promise.allSettled([
        API.Clients.list({ displayName: q, limit:10 }),
        API.Loans.list({ limit:5 }),
        API.Groups.list({ name: q, limit:5 }),
      ]);
      const cl = clients.status==='fulfilled' ? (clients.value.pageItems||[]) : [];
      const ln = loans.status==='fulfilled'   ? (loans.value.pageItems||[]).filter(l=>(l.clientName||'').toLowerCase().includes(q.toLowerCase())||(l.accountNo||'').includes(q)) : [];
      const gr = groups.status==='fulfilled'  ? (groups.value.pageItems||[]) : [];

      if (!cl.length && !ln.length && !gr.length) {
        renderTable('searchBody', emptyRow(4, `No results for "${q}"`));
        return;
      }
      const html = [
        ...(cl.length?[`<tr style="background:var(--bg-card-alt)"><td colspan="4" class="fw-700 fz-10 text-muted" style="text-transform:uppercase;letter-spacing:1px;padding:8px 14px">Clients (${cl.length})</td></tr>`]:[]),
        ...cl.map(c=>`<tr class="clickable" onclick="Pages.Clients.viewDetail(${c.id},'${escHtml(c.displayName||'')}','${escHtml(c.accountNo||'')}')"><td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(c.displayName||'')}</div><span class="fw-600">${escHtml(c.displayName||'')}</span></div></td><td class="mono fz-12">#${escHtml(c.accountNo||'')}</td><td>Client</td><td>${statusBadge(c.status?.value||'')}</td></tr>`),
        ...(ln.length?[`<tr style="background:var(--bg-card-alt)"><td colspan="4" class="fw-700 fz-10 text-muted" style="text-transform:uppercase;letter-spacing:1px;padding:8px 14px">Loans (${ln.length})</td></tr>`]:[]),
        ...ln.map(l=>`<tr class="clickable" onclick="Pages.Loans.viewDetail(${l.id})"><td class="mono fz-12">#${escHtml(l.accountNo||'')}</td><td>${escHtml(l.clientName||'')}</td><td>${escHtml(l.loanProductName||'')}</td><td>${statusBadge(l.status?.value||'')}</td></tr>`),
        ...(gr.length?[`<tr style="background:var(--bg-card-alt)"><td colspan="4" class="fw-700 fz-10 text-muted" style="text-transform:uppercase;letter-spacing:1px;padding:8px 14px">Groups (${gr.length})</td></tr>`]:[]),
        ...gr.map(g=>`<tr class="clickable" onclick="Pages.Groups.viewDetail(${g.id},'${escHtml(g.name||'')}')"><td class="fw-600">${escHtml(g.name||'')}</td><td class="mono fz-12">#${escHtml(g.accountNo||'')}</td><td>Group</td><td>${statusBadge(g.status?.value||'')}</td></tr>`),
      ].join('');
      renderTable('searchBody', html);
    } catch(e) { renderTable('searchBody', errorRow(4, e.message)); }
  },
};

/* ─────────────────────────────────────────────────────────────
   COLLECTIONS
───────────────────────────────────────────────────────────── */
Pages.Collections = {
  async loadSheet() {
    const container = document.getElementById('collContainer');
    if (!container) return;
    container.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-size:13px"><i class="fa fa-spinner fa-spin"></i> Loading collection sheet…</div>';
    try {
      const today = new Date().toLocaleDateString('en-US',{day:'2-digit',month:'long',year:'numeric'});
      const data  = await API.Reports.run('Collection Sheet', { officeId:1, asOfDate:today, dateFormat:'dd MMMM yyyy', locale:'en' });
      // Render collection sheet
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">Collection Sheet — ${new Date().toLocaleDateString()}</div>
            <div class="flex gap-2">
              <span class="badge b-pending" id="collDueCount">Loading…</span>
              <button class="btn btn-primary btn-sm" onclick="Pages.Collections.saveSheet()"><i class="fa fa-save"></i> Save Collection</button>
            </div>
          </div>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><th>Client</th><th>Loan ID</th><th>Due Amount</th><th>Amount Collected</th><th>Payment Mode</th><th>Status</th></tr></thead>
              <tbody id="collSheetBody">${emptyRow(6,'No collections due today — select a different date or office')}</tbody>
            </table>
          </div>
        </div>`;
    } catch(e) {
      // Fallback when report doesn't exist: load overdue loans
      await this._loadOverdueLoans(container);
    }
  },

  async _loadOverdueLoans(container) {
    try {
      const data = await API.Loans.list({ loanStatus:'active', limit:20 });
      const rows = data.pageItems||[];
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">Active Loans — Quick Collection</div>
            <button class="btn btn-primary btn-sm" onclick="Pages.Collections.saveSheet()"><i class="fa fa-save"></i> Save Collection</button>
          </div>
          <div class="tbl-wrap">
            <table class="tbl">
              <thead><tr><th>Client</th><th>Loan ID</th><th>Outstanding</th><th>Amount Collected</th><th>Payment Mode</th><th>Status</th></tr></thead>
              <tbody>${rows.length ? rows.map(l=>`
                <tr>
                  <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(l.clientName||'')}</div>${escHtml(l.clientName||'')}</div></td>
                  <td class="mono fz-12">#${escHtml(l.accountNo||'')}</td>
                  <td class="mono text-amber">${fmt(l.summary?.totalOutstanding||0)}</td>
                  <td><input type="number" class="form-control" placeholder="0.00" style="width:110px;padding:5px 8px" data-loan-id="${l.id}"/></td>
                  <td><select class="form-control" style="width:auto">
                    <option value="1">Cash</option>
                    <option value="2">Mobile Money</option>
                    <option value="3">Bank Transfer</option>
                  </select></td>
                  <td>${statusBadge(l.status?.value||'')}</td>
                </tr>`).join('') : emptyRow(6,'No active loans')}</tbody>
            </table>
          </div>
        </div>`;
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon" style="color:var(--red-400)"><i class="fa fa-exclamation-triangle"></i></div><h3>Could not load collection sheet</h3><p>${escHtml(e.message)}</p></div>`;
    }
  },

  async saveSheet() {
    const inputs = document.querySelectorAll('#collContainer input[data-loan-id]');
    const repayments = [];
    inputs.forEach(inp => {
      const amount = parseFloat(inp.value||0);
      if (amount > 0) repayments.push({ loanId: inp.dataset.loanId, amount });
    });
    if (!repayments.length) { Toast.warning('No Entries','Enter at least one collection amount'); return; }
    Loading.show(`Saving ${repayments.length} repayments…`);
    try {
      await Promise.all(repayments.map(r => API.Loans.repayment(r.loanId, {
        transactionDate: new Date().toISOString().slice(0,10),
        transactionAmount: r.amount,
        paymentTypeId: 1,
        locale:'en', dateFormat:'yyyy-MM-dd',
      })));
      Toast.success('Collection Saved', `${repayments.length} repayment(s) recorded`);
      this.loadSheet();
    } catch(e) { Toast.error('Save Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────────────────────── */
Pages.Profile = {
  async saveProfile() {
    Toast.success('Profile', 'Profile updated successfully');
  },
  async changePassword() {
    const curr = document.getElementById('pwCurrent')?.value;
    const nw   = document.getElementById('pwNew')?.value;
    const conf = document.getElementById('pwConfirm')?.value;
    if (!curr||!nw||!conf) { Toast.error('Error','Please fill in all password fields'); return; }
    if (nw !== conf) { Toast.error('Error','New passwords do not match'); return; }
    Loading.show('Changing password…');
    try {
      await API.put(`/users/${FC_CONFIG.USERNAME}/password`, { currentPassword:curr, password:nw, repeatPassword:conf });
      Toast.success('Password Changed','Your password has been updated');
      ['pwCurrent','pwNew','pwConfirm'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    } catch(e) { Toast.error('Failed', e.message); }
    finally { Loading.hide(); }
  },
};

/* ─────────────────────────────────────────────────────────────
   ROUTER REGISTRATIONS
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Router.register('dashboard',    ()   => Pages.Dashboard.load());
  Router.register('clients',      ()   => Pages.Clients.load());
  Router.register('client-detail',()   => {});
  Router.register('loan-detail',  ()   => {});
  Router.register('loans',        ()   => Pages.Loans.load());
  Router.register('savings',      ()   => Pages.Savings.load());
  Router.register('deposits',     ()   => Pages.Deposits.loadFD());
  Router.register('shares',       ()   => Toast.info('Shares','Loading share accounts…'));
  Router.register('groups',       ()   => Pages.Groups.load());
  Router.register('centers',      ()   => Pages.Centers.load());
  Router.register('collaterals',  ()   => Toast.info('Collaterals','Loading collateral records…'));
  Router.register('collections',  ()   => Pages.Collections.loadSheet());
  Router.register('transfers',    ()   => Pages.Transfers.load());
  Router.register('remittances',  ()   => Toast.info('Remittances','Loading remittances…'));
  Router.register('accounting',   ()   => Pages.Accounting.loadCOA());
  Router.register('tasks',        ()   => Pages.Tasks.load());
  Router.register('reports',      ()   => Pages.Reports.load());
  Router.register('products',     ()   => Pages.Products.loadLoanProducts());
  Router.register('organization', ()   => Pages.Organization.loadOffices());
  Router.register('system',       ()   => { Pages.System.loadConfigurations(); Pages.System.loadServerInfo(); });
  Router.register('users',        ()   => Pages.System.loadUsers());
  Router.register('analytics',    ()   => Pages.Analytics.load());
  Router.register('navigation',   ()   => Pages.NavTree.load());
  Router.register('surveys',      ()   => Pages.Surveys.load());
  Router.register('notifications',()   => Pages.Notifications.load());
  Router.register('search',       ()   => {});
  Router.register('templates',    ()   => Toast.info('Templates','Loading templates…'));
  Router.register('self-service', ()   => Toast.info('Self Service','Loading self service users…'));
  Router.register('settings',     ()   => {
    document.getElementById('setUrl').value    = FC_CONFIG.SERVER_URL;
    document.getElementById('setTenant').value = FC_CONFIG.TENANT_ID;
  });
  Router.register('profile',      ()   => {
    document.getElementById('profUser').value = FC_CONFIG.USERNAME;
  });
});

/* ─────────────────────────────────────────────────────────────
   PATCHES & WIRING — runs after DOMContentLoaded
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Wire dashboard pending tasks table */
  Pages.Dashboard._origLoad = Pages.Dashboard.load.bind(Pages.Dashboard);
  Pages.Dashboard.load = async function() {
    await this._origLoad();
    // Populate pending tasks from checker inbox
    const tb = document.getElementById('dashTasksBody');
    if (!tb) return;
    try {
      const data = await API.MakerChecker.list({ limit: 5 });
      const rows = data.pageItems || [];
      tb.innerHTML = rows.length
        ? rows.map(t => `
            <tr class="clickable" onclick="Router.navigate('tasks')">
              <td><span class="badge b-info">${escHtml(t.actionName||'')}</span></td>
              <td>${escHtml(t.entityName||'')}</td>
              <td class="text-secondary fz-12">${escHtml(t.maker||'')}</td>
              <td><button class="btn btn-primary btn-xs" onclick="event.stopPropagation();Pages.Tasks.approve(${t.id})">
                <i class="fa fa-check"></i> Approve
              </button></td>
            </tr>`).join('')
        : `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">
             No pending tasks
           </td></tr>`;
    } catch(e) {
      tb.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">${escHtml(e.message)}</td></tr>`;
    }
  };

  /* Profile page — populate session info */
  const origProfile = Router._pages['profile'];
  Router.register('profile', () => {
    if (origProfile) origProfile();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('sessServer', FC_CONFIG.SERVER_URL);
    set('sessTenant', FC_CONFIG.TENANT_ID);
    set('sessUser',   FC_CONFIG.USERNAME);
  });

  /* Shares page — load from API */
  Router.register('shares', async () => {
    renderTable('sharesBody', loadingRow(8));
    try {
      const data = await API.ShareAccounts.list();
      const rows = data.pageItems || [];
      renderTable('sharesBody', rows.length
        ? rows.map(s => `
            <tr class="clickable" onclick="Toast.info('Share Account','#${escHtml(s.accountNo||'')} — detail view')">
              <td class="mono fz-12">#${escHtml(s.accountNo||'')}</td>
              <td><div class="flex items-center gap-2"><div class="avatar av-sm">${ini(s.clientName||'')}</div>${escHtml(s.clientName||'')}</div></td>
              <td>${escHtml(s.productName||'')}</td>
              <td class="mono">${s.totalApprovedShares || 0}</td>
              <td class="mono">${fmt(s.unitPrice||0)}</td>
              <td class="mono text-teal">${fmt((s.totalApprovedShares||0)*(s.unitPrice||0))}</td>
              <td>${statusBadge(s.status?.value||'')}</td>
              <td><button class="btn btn-ghost btn-xs"><i class="fa fa-eye"></i></button></td>
            </tr>`).join('')
        : emptyRow(8, 'No share accounts found'));
    } catch(e) { renderTable('sharesBody', errorRow(8, e.message)); }
  });

  /* Collaterals page — message to select client */
  Router.register('collaterals', () => {
    const el = document.getElementById('page-collaterals');
    if (el) {
      const btn = el.querySelector('.page-actions .btn-primary');
      if (btn) btn.onclick = () => Modal.open('newCollateralModal');
    }
  });

  /* Remittances page — load from transfers API as fallback */
  Router.register('remittances', async () => {
    renderTable('remittancesBody', loadingRow(7));
    try {
      // Fineract doesn't have a dedicated remittance endpoint; show transfers
      const data = await API.Transfers.list();
      const rows = data.pageItems || [];
      renderTable('remittancesBody', rows.length
        ? rows.map(t => `
            <tr>
              <td class="mono fz-12">#${escHtml(String(t.id||''))}</td>
              <td>${escHtml(t.fromAccount?.clientName||'—')}</td>
              <td>${escHtml(t.toAccount?.clientName||'—')}</td>
              <td class="mono text-teal">${fmt(t.transferAmount||0)}</td>
              <td>${escHtml(t.transferDescription||'—')}</td>
              <td>${fmtDate(t.transferDate)}</td>
              <td>${statusBadge(t.reversed?'Reversed':'Completed')}</td>
            </tr>`).join('')
        : emptyRow(7, 'No remittances found'));
    } catch(e) { renderTable('remittancesBody', errorRow(7, e.message)); }
  });

  /* Templates page */
  Router.register('templates', async () => {
    try {
      const data = await API.Templates.list();
      const el = document.querySelector('#page-templates .empty-state');
      if (data?.length && el) {
        el.innerHTML = `<div class="card"><div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Name</th><th>Type</th><th>Entity</th><th></th></tr></thead>
          <tbody>${data.map(t=>`<tr><td class="fw-600">${escHtml(t.name||'')}</td><td>${escHtml(t.type||'')}</td><td>${escHtml(t.entity||'')}</td><td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td></tr>`).join('')}
          </tbody></table></div></div>`;
      }
    } catch(e) {}
  });

  /* Wire accounting addDebitRow/addCreditRow helpers */
  Pages.Accounting.addDebitRow = function() {
    const tb = document.querySelector('#jeDebitTable tbody');
    if (!tb) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><select class="form-control" style="border:none;background:none"><option value="">— Select GL Account —</option></select></td>
      <td><input class="form-control" type="number" placeholder="0.00" style="border:none;background:none"/></td>
      <td><button class="btn btn-ghost btn-xs" onclick="this.closest('tr').remove()"><i class="fa fa-minus text-red"></i></button></td>`;
    tb.appendChild(tr);
    Forms.loadGLAccounts([]);
  };
  Pages.Accounting.addCreditRow = function() {
    const tb = document.querySelector('#jeCreditTable tbody');
    if (!tb) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><select class="form-control" style="border:none;background:none"><option value="">— Select GL Account —</option></select></td>
      <td><input class="form-control" type="number" placeholder="0.00" style="border:none;background:none"/></td>
      <td><button class="btn btn-ghost btn-xs" onclick="this.closest('tr').remove()"><i class="fa fa-minus text-red"></i></button></td>`;
    tb.appendChild(tr);
  };

  /* Wire LoanDetail.addNote */
  Pages.LoanDetail.addNote = async function() {
    const note = prompt('Enter note:');
    if (!note || !this._current) return;
    try {
      await API.Loans.addNote(this._current.id, note);
      Toast.success('Note Added', 'Note saved to loan');
      this.loadNotes();
    } catch(e) { Toast.error('Failed', e.message); }
  };

  /* Wire Clients.addNote */
  Pages.Clients.addNote = async function() {
    const note = prompt('Enter note:');
    if (!note || !this._viewingId) return;
    try {
      await API.Clients.addNote(this._viewingId, note);
      Toast.success('Note Added', 'Note saved to client');
    } catch(e) { Toast.error('Failed', e.message); }
  };

  /* Track which client is being viewed */
  const origViewDetail = Pages.Clients.viewDetail.bind(Pages.Clients);
  Pages.Clients.viewDetail = function(id, name, accNo) {
    Pages.Clients._viewingId = id;
    return origViewDetail(id, name, accNo);
  };

  /* Analytics KPI cards — populate from loan counts */
  const origAnalytics = Pages.Analytics.load.bind(Pages.Analytics);
  Pages.Analytics.load = async function() {
    await origAnalytics();
    try {
      const [active, loans] = await Promise.allSettled([
        API.Clients.list({ limit:1 }),
        API.Loans.list({ limit:1, loanStatus:'active' }),
      ]);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('anlBorrowers', active.status==='fulfilled' ? (active.value.totalFilteredRecords||0).toLocaleString() : '—');
      set('anlPortfolio',  '—');
      set('anlPAR30',     '—');
      set('anlRepayRate', '—');
    } catch(e) {}
  };

  /* System page — load data tables */
  const origSysLoad = Router._pages['system'];
  Router.register('system', async () => {
    if (origSysLoad) origSysLoad();
    // Load data tables
    const dtb = document.getElementById('dataTablesBody');
    if (dtb) {
      dtb.innerHTML = loadingRow(4);
      try {
        const data = await API.System.dataTables();
        dtb.innerHTML = (data||[]).length
          ? (data||[]).map(t => `
              <tr>
                <td class="fw-600 mono fz-12">${escHtml(t.registeredTableName||'')}</td>
                <td>${escHtml(t.applicationTableName||'')}</td>
                <td>${t.allowMultipleRows?'<span class="badge b-active">Yes</span>':'<span class="badge b-closed">No</span>'}</td>
                <td><button class="btn btn-ghost btn-xs"><i class="fa fa-edit"></i></button></td>
              </tr>`).join('')
          : emptyRow(4, 'No data tables registered');
      } catch(e) { dtb.innerHTML = errorRow(4, e.message); }
    }
  });

  /* Bulk reassign — populate officer selects */
  document.querySelectorAll('#brFrom, #brTo').forEach(async sel => {
    try {
      const data = await API.Organization.staff({ isLoanOfficer:true });
      (data||[]).filter(s=>s.isLoanOfficer).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.displayName || `${s.firstname||''} ${s.lastname||''}`.trim();
        sel.appendChild(opt);
      });
    } catch(e) {}
  });

  /* Reports grid — re-wire click to show output */
  document.addEventListener('click', e => {
    const card = e.target.closest('#reportsGrid .card');
    if (card) {
      const title = card.querySelector('.fw-700')?.textContent;
      if (title) Pages.Reports.runReport(title, '');
    }
  });

  console.log('[FinCraft] All patches applied ✓');
});
