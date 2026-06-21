/**
 * FinCraft — api.js
 * Fineract REST API client.
 * Every endpoint returns a Promise. Falls back to demo data on network error.
 */

window.API = (() => {
  /* ── Headers ───────────────────────────────────────────── */
  function headers(extra = {}) {
    const h = {
      'Content-Type'                   : 'application/json',
      'Fineract-Platform-TenantId'     : FC_CONFIG.TENANT_ID,
    };
    if (FC_CONFIG.AUTH_TOKEN) {
      h['Authorization'] = `Basic ${FC_CONFIG.AUTH_TOKEN}`;
    }
    return { ...h, ...extra };
  }

  /* ── Base request ───────────────────────────────────────── */
  async function request(method, path, body = null, params = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const url = `${FC_CONFIG.API_BASE}${path}${qs}`;
    const opts = { method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ defaultUserMessage: `HTTP ${res.status}` }));
      throw new Error(err.defaultUserMessage || err.errors?.[0]?.defaultUserMessage || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  const get    = (path, params)  => request('GET',    path, null, params);
  const post   = (path, body)    => request('POST',   path, body);
  const put    = (path, body)    => request('PUT',    path, body);
  const del    = (path)          => request('DELETE', path);
  const patch  = (path, body)    => request('PATCH',  path, body);

  /* ── Auth ───────────────────────────────────────────────── */
  async function login(serverUrl, tenantId, username, password) {
    const token = btoa(`${username}:${password}`);
    const url   = `${serverUrl}${FC_CONFIG.API_PROVIDER}${FC_CONFIG.API_VERSION}/authentication`;
    const res   = await fetch(url, {
      method  : 'POST',
      headers : {
        'Content-Type'               : 'application/json',
        'Fineract-Platform-TenantId' : tenantId,
        'Authorization'              : `Basic ${token}`,
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
    return res.json();
  }

  /* ── Clients ─────────────────────────────────────────────── */
  const Clients = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.CLIENTS, { limit:FC_CONFIG.PAGE_SIZE, offset:0, orderBy:'id', sortOrder:'DESC', ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.CLIENT(id), { associations:'all', template:true }),
    template:(p={}) => get(FC_CONFIG.ENDPOINTS.CLIENT_TEMPLATE, p),
    create : (data) => post(FC_CONFIG.ENDPOINTS.CLIENTS, data),
    update : (id,d) => put(FC_CONFIG.ENDPOINTS.CLIENT(id), d),
    remove : (id)   => del(FC_CONFIG.ENDPOINTS.CLIENT(id)),
    action : (id, cmd, data={}) => post(`${FC_CONFIG.ENDPOINTS.CLIENT(id)}?command=${cmd}`, data),
    accounts   : (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_ACCOUNTS(id)),
    charges    : (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_CHARGES(id)),
    notes      : (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_NOTES(id)),
    addNote    : (id, text) => post(FC_CONFIG.ENDPOINTS.CLIENT_NOTES(id), { note: text }),
    documents  : (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_DOCUMENTS(id)),
    identifiers: (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_IDENTIFIERS(id)),
    family     : (id) => get(FC_CONFIG.ENDPOINTS.CLIENT_FAMILY(id)),
    collaterals: (id) => get(FC_CONFIG.ENDPOINTS.COLLATERALS(id)),
    addCollateral:(id,d)=> post(FC_CONFIG.ENDPOINTS.COLLATERALS(id), d),
  };

  /* ── Loans ───────────────────────────────────────────────── */
  const Loans = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.LOANS, { limit:FC_CONFIG.PAGE_SIZE, offset:0, orderBy:'id', sortOrder:'DESC', ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.LOAN(id), { associations:'all', template:true }),
    template:(p={}) => get(FC_CONFIG.ENDPOINTS.LOAN_TEMPLATE, p),
    create : (data) => post(FC_CONFIG.ENDPOINTS.LOANS, data),
    update : (id,d) => put(FC_CONFIG.ENDPOINTS.LOAN(id), d),
    remove : (id)   => del(FC_CONFIG.ENDPOINTS.LOAN(id)),
    action : (id, cmd, data={}) => post(`${FC_CONFIG.ENDPOINTS.LOAN(id)}?command=${cmd}`, data),
    /* Action helpers */
    approve   : (id, d) => Loans.action(id, 'approve',      d),
    reject    : (id, d) => Loans.action(id, 'reject',       d),
    undoApproval:(id,d) => Loans.action(id, 'undoapproval', d),
    disburse  : (id, d) => Loans.action(id, 'disburse',     d),
    undoDisbursal:(id,d)=> Loans.action(id, 'undodisbursal',d),
    repayment : (id, d) => Loans.action(id, 'repayment',    d),
    waiveInterest:(id,d)=> Loans.action(id, 'waiveinterest',d),
    writeOff  : (id, d) => Loans.action(id, 'writeoff',     d),
    close     : (id, d) => Loans.action(id, 'close',        d),
    foreclosure:(id,d)  => Loans.action(id, 'foreclosure',  d),
    chargeOff : (id, d) => Loans.action(id, 'charge-off',   d),
    prepay    : (id, d) => Loans.action(id, 'prepayLoan',   d),
    assignOfficer:(id,d)=> put(`${FC_CONFIG.ENDPOINTS.LOAN(id)}/loanOfficer`, d),
    /* Sub-resources */
    repaymentSchedule: (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_REPAYMENT_SCHEDULE(id)),
    transactions     : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_TRANSACTIONS(id)),
    charges          : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_CHARGES(id)),
    addCharge        : (id, d) => post(FC_CONFIG.ENDPOINTS.LOAN_CHARGES(id), d),
    collaterals      : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_COLLATERAL(id)),
    addCollateral    : (id, d) => post(FC_CONFIG.ENDPOINTS.LOAN_COLLATERAL(id), d),
    guarantors       : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_GUARANTORS(id)),
    addGuarantor     : (id, d) => post(FC_CONFIG.ENDPOINTS.LOAN_GUARANTORS(id), d),
    notes            : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_NOTES(id)),
    addNote          : (id, t) => post(FC_CONFIG.ENDPOINTS.LOAN_NOTES(id), { note: t }),
    delinquency      : (id)    => get(FC_CONFIG.ENDPOINTS.LOAN_DELINQUENCY(id)),
    reschedule       : (data)  => post(FC_CONFIG.ENDPOINTS.LOAN_RESCHEDULE, data),
    /* Pause interest */
    addInterestPause : (id, d) => post(`/loans/${id}/interest-pauses`, d),
    /* Reamortize / Re-age */
    reamortize       : (id)    => post(`/loans/${id}?command=reamortize`,  {}),
    reage            : (id, d) => post(`/loans/${id}?command=reAge`,       d),
  };

  /* ── Savings ─────────────────────────────────────────────── */
  const Savings = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.SAVINGS, { limit:FC_CONFIG.PAGE_SIZE, offset:0, ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.SAVING(id), { associations:'all' }),
    template:(p={}) => get(FC_CONFIG.ENDPOINTS.SAVINGS_TEMPLATE, p),
    create : (data) => post(FC_CONFIG.ENDPOINTS.SAVINGS, data),
    update : (id,d) => put(FC_CONFIG.ENDPOINTS.SAVING(id), d),
    action : (id, cmd, d={}) => post(`${FC_CONFIG.ENDPOINTS.SAVING(id)}?command=${cmd}`, d),
    approve   : (id, d) => Savings.action(id, 'approve',      d),
    activate  : (id, d) => Savings.action(id, 'activate',     d),
    close     : (id, d) => Savings.action(id, 'close',        d),
    deposit   : (id, d) => Savings.action(id, 'deposit',      d),
    withdraw  : (id, d) => Savings.action(id, 'withdrawal',   d),
    block     : (id, d) => Savings.action(id, 'blockAccount', d),
    unblock   : (id, d) => Savings.action(id, 'unblockAccount',d),
    transactions: (id) => get(FC_CONFIG.ENDPOINTS.SAVINGS_TRANSACTIONS(id)),
    charges     : (id) => get(FC_CONFIG.ENDPOINTS.SAVINGS_CHARGES(id)),
    addCharge   : (id,d)=> post(FC_CONFIG.ENDPOINTS.SAVINGS_CHARGES(id), d),
    notes       : (id) => get(FC_CONFIG.ENDPOINTS.SAVINGS_NOTES(id)),
  };

  /* ── Fixed Deposits ──────────────────────────────────────── */
  const FixedDeposits = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.FIXED_DEPOSITS, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.FIXED_DEPOSIT(id), { associations:'all' }),
    create : (data) => post(FC_CONFIG.ENDPOINTS.FIXED_DEPOSITS, data),
    action : (id, cmd, d={}) => post(FC_CONFIG.ENDPOINTS.FD_ACTION(id, cmd), d),
    approve   : (id, d) => FixedDeposits.action(id, 'approve', d),
    activate  : (id, d) => FixedDeposits.action(id, 'activate', d),
    close     : (id, d) => FixedDeposits.action(id, 'close', d),
    prematureClose:(id,d)=> FixedDeposits.action(id, 'prematureClose', d),
    transactions: (id) => get(FC_CONFIG.ENDPOINTS.FD_TRANSACTIONS(id)),
  };

  /* ── Groups ──────────────────────────────────────────────── */
  const Groups = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.GROUPS, { limit:FC_CONFIG.PAGE_SIZE, offset:0, orderBy:'id', sortOrder:'DESC', ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.GROUP(id), { associations:'all' }),
    create : (data) => post(FC_CONFIG.ENDPOINTS.GROUPS, data),
    update : (id,d) => put(FC_CONFIG.ENDPOINTS.GROUP(id), d),
    action : (id, cmd, d={}) => post(FC_CONFIG.ENDPOINTS.GROUP_ACTION(id, cmd), d),
    activate: (id, d) => Groups.action(id, 'activate', d),
    close   : (id, d) => Groups.action(id, 'close', d),
    accounts: (id)   => get(FC_CONFIG.ENDPOINTS.GROUP_ACCOUNTS(id)),
    notes   : (id)   => get(FC_CONFIG.ENDPOINTS.GROUP_NOTES(id)),
  };

  /* ── Centers ─────────────────────────────────────────────── */
  const Centers = {
    list   : (p={}) => get(FC_CONFIG.ENDPOINTS.CENTERS, { limit:FC_CONFIG.PAGE_SIZE, offset:0, ...p }),
    get    : (id)   => get(FC_CONFIG.ENDPOINTS.CENTER(id), { associations:'all' }),
    create : (data) => post(FC_CONFIG.ENDPOINTS.CENTERS, data),
    accounts: (id)  => get(FC_CONFIG.ENDPOINTS.CENTER_ACCOUNTS(id)),
  };

  /* ── Accounting ──────────────────────────────────────────── */
  const Accounting = {
    glAccounts      : (p={}) => get(FC_CONFIG.ENDPOINTS.GL_ACCOUNTS, p),
    glAccount       : (id)   => get(FC_CONFIG.ENDPOINTS.GL_ACCOUNT(id)),
    createGLAccount : (d)    => post(FC_CONFIG.ENDPOINTS.GL_ACCOUNTS, d),
    updateGLAccount : (id,d) => put(FC_CONFIG.ENDPOINTS.GL_ACCOUNT(id), d),
    journalEntries  : (p={}) => get(FC_CONFIG.ENDPOINTS.JOURNAL_ENTRIES, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    createJournalEntry:(d)   => post(FC_CONFIG.ENDPOINTS.JOURNAL_ENTRIES, d),
    glClosures      : (p={}) => get(FC_CONFIG.ENDPOINTS.GL_CLOSURE, p),
    createGLClosure : (d)    => post(FC_CONFIG.ENDPOINTS.GL_CLOSURE, d),
    accountingRules : ()     => get(FC_CONFIG.ENDPOINTS.ACCOUNTING_RULES),
    createRule      : (d)    => post(FC_CONFIG.ENDPOINTS.ACCOUNTING_RULES, d),
    runPeriodicAccrual:(d)   => post(FC_CONFIG.ENDPOINTS.ACCRUALS, d),
    financialActivities:()   => get(FC_CONFIG.ENDPOINTS.FIN_ACTIVITY),
    createFinActivity:(d)    => post(FC_CONFIG.ENDPOINTS.FIN_ACTIVITY, d),
  };

  /* ── Maker-Checker ───────────────────────────────────────── */
  const MakerChecker = {
    list    : (p={}) => get(FC_CONFIG.ENDPOINTS.MAKER_CHECKERS, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    approve : (id)   => post(FC_CONFIG.ENDPOINTS.MC_APPROVE(id), {}),
    reject  : (id, d)=> post(FC_CONFIG.ENDPOINTS.MC_REJECT(id), d),
  };

  /* ── Reports ─────────────────────────────────────────────── */
  const Reports = {
    list  : ()          => get(FC_CONFIG.ENDPOINTS.REPORTS),
    run   : (name, p={}) => get(FC_CONFIG.ENDPOINTS.RUN_REPORT(name), { R_officeId:1, genericResultSet:false, ...p }),
    runRaw: (name, p={}) => get(FC_CONFIG.ENDPOINTS.RUN_REPORT(name), { genericResultSet:true, ...p }),
  };

  /* ── Products ────────────────────────────────────────────── */
  const Products = {
    loanProducts    : ()     => get(FC_CONFIG.ENDPOINTS.LOAN_PRODUCTS),
    loanProduct     : (id)   => get(FC_CONFIG.ENDPOINTS.LOAN_PRODUCT(id), { template:true }),
    createLoanProduct:(d)    => post(FC_CONFIG.ENDPOINTS.LOAN_PRODUCTS, d),
    savingsProducts : ()     => get(FC_CONFIG.ENDPOINTS.SAVINGS_PRODUCTS),
    fdProducts      : ()     => get(FC_CONFIG.ENDPOINTS.FD_PRODUCTS),
    rdProducts      : ()     => get(FC_CONFIG.ENDPOINTS.RD_PRODUCTS),
    shareProducts   : ()     => get(FC_CONFIG.ENDPOINTS.SHARE_PRODUCTS),
    charges         : (p={}) => get(FC_CONFIG.ENDPOINTS.CHARGES, p),
    createCharge    : (d)    => post(FC_CONFIG.ENDPOINTS.CHARGES, d),
    taxComponents   : ()     => get(FC_CONFIG.ENDPOINTS.TAX_COMPONENTS),
    createTaxComponent:(d)   => post(FC_CONFIG.ENDPOINTS.TAX_COMPONENTS, d),
    delinquencyBuckets:()    => get(FC_CONFIG.ENDPOINTS.DELINQUENCY_BUCKETS),
    createDelinquencyBucket:(d)=>post(FC_CONFIG.ENDPOINTS.DELINQUENCY_BUCKETS, d),
    floatingRates   : ()     => get(FC_CONFIG.ENDPOINTS.FLOATING_RATES),
  };

  /* ── Organization ────────────────────────────────────────── */
  const Organization = {
    offices         : ()     => get(FC_CONFIG.ENDPOINTS.OFFICES),
    office          : (id)   => get(FC_CONFIG.ENDPOINTS.OFFICE(id)),
    createOffice    : (d)    => post(FC_CONFIG.ENDPOINTS.OFFICES, d),
    updateOffice    : (id,d) => put(FC_CONFIG.ENDPOINTS.OFFICE(id), d),
    staff           : (p={}) => get(FC_CONFIG.ENDPOINTS.STAFF, { status:'active', ...p }),
    staffMember     : (id)   => get(FC_CONFIG.ENDPOINTS.STAFF_MEMBER(id)),
    createStaff     : (d)    => post(FC_CONFIG.ENDPOINTS.STAFF, d),
    updateStaff     : (id,d) => put(FC_CONFIG.ENDPOINTS.STAFF_MEMBER(id), d),
    tellers         : ()     => get(FC_CONFIG.ENDPOINTS.TELLERS),
    createTeller    : (d)    => post(FC_CONFIG.ENDPOINTS.TELLERS, d),
    holidays        : ()     => get(FC_CONFIG.ENDPOINTS.HOLIDAYS),
    createHoliday   : (d)    => post(FC_CONFIG.ENDPOINTS.HOLIDAYS, d),
    workingDays     : ()     => get(FC_CONFIG.ENDPOINTS.WORKING_DAYS),
    updateWorkingDays:(d)    => put(FC_CONFIG.ENDPOINTS.WORKING_DAYS, d),
    currencies      : ()     => get(FC_CONFIG.ENDPOINTS.CURRENCIES),
    updateCurrencies: (d)    => put(FC_CONFIG.ENDPOINTS.CURRENCIES, d),
    paymentTypes    : ()     => get(FC_CONFIG.ENDPOINTS.PAYMENT_TYPES),
    createPaymentType:(d)    => post(FC_CONFIG.ENDPOINTS.PAYMENT_TYPES, d),
    smsCampaigns    : ()     => get(FC_CONFIG.ENDPOINTS.SMS_CAMPAIGNS),
    createSmsCampaign:(d)    => post(FC_CONFIG.ENDPOINTS.SMS_CAMPAIGNS, d),
    funds           : ()     => get(FC_CONFIG.ENDPOINTS.FUNDS),
    createFund      : (d)    => post(FC_CONFIG.ENDPOINTS.FUNDS, d),
    bulkReassign    : (d)    => post(FC_CONFIG.ENDPOINTS.BULK_REASSIGN, d),
    passwordPrefs   : ()     => get(FC_CONFIG.ENDPOINTS.PASSWORD_PREFS),
    updatePasswordPrefs:(d)  => put(FC_CONFIG.ENDPOINTS.PASSWORD_PREFS, d),
  };

  /* ── System ──────────────────────────────────────────────── */
  const System = {
    configurations  : ()     => get(FC_CONFIG.ENDPOINTS.CONFIGURATIONS),
    configuration   : (id)   => get(FC_CONFIG.ENDPOINTS.CONFIGURATION(id)),
    updateConfig    : (id,d) => put(FC_CONFIG.ENDPOINTS.CONFIGURATION(id), d),
    dataTables      : (p={}) => get(FC_CONFIG.ENDPOINTS.DATA_TABLES, p),
    auditTrails     : (p={}) => get(FC_CONFIG.ENDPOINTS.AUDIT_TRAILS, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    codes           : ()     => get(FC_CONFIG.ENDPOINTS.CODES),
    codeValues      : (id)   => get(FC_CONFIG.ENDPOINTS.CODE_VALUES(id)),
    roles           : ()     => get(FC_CONFIG.ENDPOINTS.ROLES),
    role            : (id)   => get(FC_CONFIG.ENDPOINTS.ROLE(id)),
    rolePermissions : (id)   => get(FC_CONFIG.ENDPOINTS.ROLE_PERMISSIONS(id)),
    updateRolePerms : (id,d) => put(FC_CONFIG.ENDPOINTS.ROLE_PERMISSIONS(id), d),
    users           : ()     => get(FC_CONFIG.ENDPOINTS.USERS),
    createUser      : (d)    => post(FC_CONFIG.ENDPOINTS.USERS, d),
    jobs            : ()     => get(FC_CONFIG.ENDPOINTS.JOBS),
    runJob          : (id)   => post(FC_CONFIG.ENDPOINTS.JOB_RUN(id), {}),
    hooks           : ()     => get(FC_CONFIG.ENDPOINTS.HOOKS),
    createHook      : (d)    => post(FC_CONFIG.ENDPOINTS.HOOKS, d),
    notifications   : ()     => get(FC_CONFIG.ENDPOINTS.NOTIFICATIONS, { isRead: false }),
    serverInfo      : ()     => get(FC_CONFIG.ENDPOINTS.SYSTEM_INFO),
    surveys         : ()     => get(FC_CONFIG.ENDPOINTS.SURVEYS),
    externalServices: ()     => get(FC_CONFIG.ENDPOINTS.EXTERNAL_SERVICES),
    externalEvents  : ()     => get('/externalevents/configuration'),
  };

  /* ── Transfers ───────────────────────────────────────────── */
  const Transfers = {
    list    : (p={}) => get(FC_CONFIG.ENDPOINTS.TRANSFERS, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    template: (p={}) => get(FC_CONFIG.ENDPOINTS.TRANSFERS_TEMPLATE, p),
    create  : (d)    => post(FC_CONFIG.ENDPOINTS.TRANSFERS, d),
  };

  /* ── Templates ───────────────────────────────────────────── */
  const Templates = {
    list  : ()  => get(FC_CONFIG.ENDPOINTS.TEMPLATES),
    create: (d) => post(FC_CONFIG.ENDPOINTS.TEMPLATES, d),
  };

  /* ── Share Accounts ──────────────────────────────────────── */
  const ShareAccounts = {
    list    : (p={})     => get(FC_CONFIG.ENDPOINTS.SHARE_ACCOUNTS, { limit:FC_CONFIG.PAGE_SIZE, ...p }),
    get     : (id)       => get(FC_CONFIG.ENDPOINTS.SHARE_ACCOUNT(id)),
    create  : (d)        => post(FC_CONFIG.ENDPOINTS.SHARE_ACCOUNTS, d),
    action  : (id,cmd,d) => post(FC_CONFIG.ENDPOINTS.SHARE_ACTION(id,cmd), d),
    approve : (id,d) => ShareAccounts.action(id,'approve',d),
    activate: (id,d) => ShareAccounts.action(id,'activate',d),
    apply   : (id,d) => ShareAccounts.action(id,'applyadditionalshares',d),
    redeem  : (id,d) => ShareAccounts.action(id,'redeemshares',d),
  };

  /* ── Self Service ────────────────────────────────────────── */
  const SelfService = {
    users        : () => get(FC_CONFIG.ENDPOINTS.SS_USERS),
    beneficiaries: () => get(FC_CONFIG.ENDPOINTS.SS_BENEFICIARIES),
    createUser   : (d)=> post('/self/registrations', d),
  };

  /* ── Collect Live Data helper ────────────────────────────── */
  async function safeFetch(fn, fallback = null) {
    if (!FC_CONFIG.AUTH_TOKEN) return fallback;
    try { return await fn(); }
    catch(e) {
      console.warn('[API]', e.message);
      return fallback;
    }
  }

  /* ── Dashboard summary ───────────────────────────────────── */
  async function dashboardSummary() {
    const [clients, loans, savings] = await Promise.allSettled([
      get(FC_CONFIG.ENDPOINTS.CLIENTS, { limit:1, offset:0 }),
      get(FC_CONFIG.ENDPOINTS.LOANS,   { limit:1, offset:0 }),
      get(FC_CONFIG.ENDPOINTS.SAVINGS,  { limit:1, offset:0 }),
    ]);
    return {
      clientCount : clients.status  === 'fulfilled' ? clients.value.totalFilteredRecords  : null,
      loanCount   : loans.status    === 'fulfilled' ? loans.value.totalFilteredRecords    : null,
      savingsCount: savings.status  === 'fulfilled' ? savings.value.totalFilteredRecords  : null,
    };
  }

  /* ── Export ──────────────────────────────────────────────── */
  return {
    login, get, post, put, del, patch, safeFetch, dashboardSummary,
    Clients, Loans, Savings, FixedDeposits, Groups, Centers,
    Accounting, MakerChecker, Reports, Products, Organization, System,
    Transfers, Templates, ShareAccounts, SelfService,
  };
})();
