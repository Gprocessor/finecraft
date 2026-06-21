<<<<<<< HEAD
/* FinCraft · api.js — Apache Fineract REST API client.
   All endpoints follow the canonical Fineract paths under /fineract-provider/api/v1
   See: https://demo.mifos.io/api-docs/apiLive.htm */
import { getRuntimeConfig } from './config.js';
const CFG = getRuntimeConfig();

class FineractAPI {
  constructor() { this.serverUrl = ''; this.tenantId = 'default'; this.authToken = ''; }
  configure({ serverUrl, tenantId, authToken }) {
    if (serverUrl != null) this.serverUrl = serverUrl.replace(/\/$/, '');
    if (tenantId  != null) this.tenantId  = tenantId;
    if (authToken != null) this.authToken = authToken;
  }
  reset() { this.serverUrl = ''; this.authToken = ''; }

  _url(path, params) {
    let u = `${this.serverUrl}${CFG.apiBase}${path}`;
    if (params && Object.keys(params).length) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) if (v != null && v !== '') q.append(k, v);
      const s = q.toString();
      if (s) u += (u.includes('?') ? '&' : '?') + s;
    }
    return u;
  }
  _headers(extra = {}) {
    const h = { 'Accept': 'application/json', 'Content-Type': 'application/json',
                'Fineract-Platform-TenantId': this.tenantId, ...extra };
    if (this.authToken) h['Authorization'] = 'Basic ' + this.authToken;
    return h;
  }
  async _req(method, path, { params, body, headers, raw, timeoutMs } = {}) {
    const url = this._url(path, params);
    const opts = { method, headers: this._headers(headers) };
    if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const ctrl = new AbortController(); opts.signal = ctrl.signal;
    const t = setTimeout(() => ctrl.abort(), timeoutMs ?? CFG.requestTimeoutMs);
    try {
      const r = await fetch(url, opts);
      clearTimeout(t);
      if (!r.ok) {
        let detail; try { detail = await r.json(); } catch { detail = await r.text(); }
        const err = new Error(`API ${r.status} on ${method} ${path}`);
        err.status = r.status; err.detail = detail; throw err;
      }
      if (raw) return r;
      const ct = r.headers.get('content-type') || '';
      if (r.status === 204) return null;
      if (ct.includes('application/json')) return r.json();
      return r.text();
    } catch (e) {
      clearTimeout(t);
      if (e.name === 'AbortError') { const err = new Error('Request timed out'); err.code = 'TIMEOUT'; throw err; }
      throw e;
    }
  }
  _g(p, params, opts) { return this._req('GET',    p, { params, ...opts }); }
  _p(p, body,   opts) { return this._req('POST',   p, { body,   ...opts }); }
  _u(p, body,   opts) { return this._req('PUT',    p, { body,   ...opts }); }
  _d(p, body,   opts) { return this._req('DELETE', p, { body,   ...opts }); }

  /** POST /authentication?username=&password= -> { base64EncodedAuthenticationKey } */
  async auth(username, password, opts = {}) {
    const r = await this._req('POST', '/authentication',
      { params: { username, password }, body: '', timeoutMs: opts.timeoutMs ?? CFG.autoConnectTimeoutMs });
    return r?.base64EncodedAuthenticationKey || '';
  }

  // ============== CLIENTS ==============
  clients = {
    list:     (params)        => this._g('/clients', params),
    get:      (id, params)    => this._g(`/clients/${id}`, params),
    template: ()              => this._g('/clients/template'),
    create:   (body)          => this._p('/clients', body),
    update:   (id, body)      => this._u(`/clients/${id}`, body),
    activate: (id, date)      => this._p(`/clients/${id}?command=activate`, { activationDate: date, dateFormat: 'yyyy-MM-dd', locale: 'en' }),
    close:    (id, body)      => this._p(`/clients/${id}?command=close`, body),
    reject:   (id, body)      => this._p(`/clients/${id}?command=reject`, body),
    withdraw: (id, body)      => this._p(`/clients/${id}?command=withdraw`, body),
    reactivate:(id, body)     => this._p(`/clients/${id}?command=reactivate`, body),
    transfer: (id, body)      => this._p(`/clients/${id}?command=proposeTransfer`, body),
    acceptTransfer: (id, body)=> this._p(`/clients/${id}?command=acceptTransfer`, body),
    rejectTransfer: (id, body)=> this._p(`/clients/${id}?command=rejectTransfer`, body),
    delete:   (id)            => this._d(`/clients/${id}`),
    accounts: (id)            => this._g(`/clients/${id}/accounts`),
    charges:  (id)            => this._g(`/clients/${id}/charges`),
    addCharge:(id, body)      => this._p(`/clients/${id}/charges`, body),
    images:   (id)            => this._g(`/clients/${id}/images`),
    documents:(id)            => this._g(`/clients/${id}/documents`),
    identifiers: (id)         => this._g(`/clients/${id}/identifiers`),
    addresses:(id)            => this._g(`/clients/${id}/addresses`),
    familyMembers: (id)       => this._g(`/clients/${id}/familymembers`),
    obligeeDetails: (id)      => this._g(`/clients/${id}/obligeedetails`)
  };

  // ============== LOANS ==============
  loans = {
    list:           (params)             => this._g('/loans', params),
    get:            (id, assoc = 'all')  => this._g(`/loans/${id}`, { associations: assoc }),
    template:       (params)             => this._g('/loans/template', params),
    create:         (body)               => this._p('/loans', body),
    update:         (id, body)           => this._u(`/loans/${id}`, body),
    approve:        (id, body)           => this._p(`/loans/${id}?command=approve`, body),
    undoApproval:   (id)                 => this._p(`/loans/${id}?command=undoApproval`, {}),
    disburse:       (id, body)           => this._p(`/loans/${id}?command=disburse`, body),
    disburseToSavings: (id, body)        => this._p(`/loans/${id}?command=disburseToSavings`, body),
    undoDisbursal:  (id)                 => this._p(`/loans/${id}?command=undoDisbursal`, {}),
    repay:          (id, body)           => this._p(`/loans/${id}/transactions?command=repayment`, body),
    merchantIssued: (id, body)           => this._p(`/loans/${id}/transactions?command=merchantIssuedRefund`, body),
    payoutRefund:   (id, body)           => this._p(`/loans/${id}/transactions?command=payoutRefund`, body),
    chargebackTx:   (id, txId, body)     => this._p(`/loans/${id}/transactions/${txId}?command=chargeback`, body),
    waiveInterest:  (id, body)           => this._p(`/loans/${id}/transactions?command=waiveinterest`, body),
    writeOff:       (id, body)           => this._p(`/loans/${id}/transactions?command=writeoff`, body),
    chargeOff:      (id, body)           => this._p(`/loans/${id}?command=charge-off`, body),
    undoChargeOff:  (id, body)           => this._p(`/loans/${id}?command=undo-charge-off`, body),
    close:          (id, body)           => this._p(`/loans/${id}/transactions?command=close`, body),
    closeAsRescheduled: (id, body)       => this._p(`/loans/${id}/transactions?command=close-rescheduled`, body),
    reschedule:     (body)               => this._p('/rescheduleloans', body),
    approveReschedule: (id, body)        => this._p(`/rescheduleloans/${id}?command=approve`, body),
    rejectReschedule:  (id, body)        => this._p(`/rescheduleloans/${id}?command=reject`, body),
    foreclose:      (id, body)           => this._p(`/loans/${id}?command=foreclosure`, body),
    reage:          (id, body)           => this._p(`/loans/${id}?command=re-age`, body),
    reamortize:     (id, body)           => this._p(`/loans/${id}?command=re-amortize`, body),
    assignOfficer:  (id, body)           => this._p(`/loans/${id}?command=assignLoanOfficer`, body),
    removeOfficer:  (id, body)           => this._p(`/loans/${id}?command=removeLoanOfficer`, body),
    addCharge:      (id, body)           => this._p(`/loans/${id}/charges`, body),
    waiveCharge:    (id, cid)            => this._p(`/loans/${id}/charges/${cid}?command=waive`, {}),
    payCharge:      (id, cid, body)      => this._p(`/loans/${id}/charges/${cid}?command=pay`, body),
    addCollateral:  (id, body)           => this._p(`/loans/${id}/collaterals`, body),
    guarantors:     (id)                 => this._g(`/loans/${id}/guarantors`),
    addGuarantor:   (id, body)           => this._p(`/loans/${id}/guarantors`, body),
    schedule:       (id)                 => this._g(`/loans/${id}`, { associations: 'repaymentSchedule' }),
    transactions:   (id)                 => this._g(`/loans/${id}/transactions`),
    transaction:    (id, txId)           => this._g(`/loans/${id}/transactions/${txId}`),
    delinquency:    (id)                 => this._g(`/loans/${id}/delinquency-actions`),
    addDelinquencyAction: (id, body)     => this._p(`/loans/${id}/delinquency-actions`, body),
    standingInstructions: (id)           => this._g(`/loans/${id}?associations=standingInstructions`),
    interestPauses: (id)                 => this._g(`/loans/${id}/interest-pauses`),
    interestPause:  (id, body)           => this._p(`/loans/${id}/interest-pauses`, body),
    glimAccounts:   (id)                 => this._g(`/loans/glimAccount/${id}`),
    delete:         (id)                 => this._d(`/loans/${id}`)
  };

  // ============== SAVINGS ==============
  savings = {
    list:        (params)      => this._g('/savingsaccounts', params),
    get:         (id, params)  => this._g(`/savingsaccounts/${id}`, params),
    template:    (params)      => this._g('/savingsaccounts/template', params),
    create:      (body)        => this._p('/savingsaccounts', body),
    approve:     (id, body)    => this._p(`/savingsaccounts/${id}?command=approve`, body),
    undoApproval:(id)          => this._p(`/savingsaccounts/${id}?command=undoApproval`, {}),
    reject:      (id, body)    => this._p(`/savingsaccounts/${id}?command=reject`, body),
    withdraw:    (id, body)    => this._p(`/savingsaccounts/${id}?command=withdrawnByApplicant`, body),
    activate:    (id, body)    => this._p(`/savingsaccounts/${id}?command=activate`, body),
    deposit:     (id, body)    => this._p(`/savingsaccounts/${id}/transactions?command=deposit`, body),
    withdrawTx:  (id, body)    => this._p(`/savingsaccounts/${id}/transactions?command=withdrawal`, body),
    holdAmount:  (id, body)    => this._p(`/savingsaccounts/${id}/transactions?command=holdAmount`, body),
    releaseAmount:(id, txId)   => this._p(`/savingsaccounts/${id}/transactions/${txId}?command=releaseAmount`, {}),
    close:       (id, body)    => this._p(`/savingsaccounts/${id}?command=close`, body),
    postInterest:(id, body)    => this._p(`/savingsaccounts/${id}?command=postInterest`, body || {}),
    calculateInterest: (id)    => this._p(`/savingsaccounts/${id}?command=calculateInterest`, {}),
    block:       (id)          => this._p(`/savingsaccounts/${id}?command=block`, {}),
    unblock:     (id)          => this._p(`/savingsaccounts/${id}?command=unblock`, {}),
    blockDeposit:(id)          => this._p(`/savingsaccounts/${id}?command=blockDeposit`, {}),
    unblockDeposit:(id)        => this._p(`/savingsaccounts/${id}?command=unblockDeposit`, {}),
    blockWithdrawal:(id)       => this._p(`/savingsaccounts/${id}?command=blockWithdrawal`, {}),
    unblockWithdrawal:(id)     => this._p(`/savingsaccounts/${id}?command=unblockWithdrawal`, {}),
    update:      (id, body)    => this._u(`/savingsaccounts/${id}`, body),
    delete:      (id)          => this._d(`/savingsaccounts/${id}`),
    charges:     (id)          => this._g(`/savingsaccounts/${id}/charges`),
    addCharge:   (id, body)    => this._p(`/savingsaccounts/${id}/charges`, body),
    transactions:(id)          => this._g(`/savingsaccounts/${id}/transactions`)
  };

  // ============== FIXED & RECURRING DEPOSITS ==============
  fixedDeposits = {
    list:     (params)   => this._g('/fixeddepositaccounts', params),
    get:      (id)       => this._g(`/fixeddepositaccounts/${id}`),
    template: (params)   => this._g('/fixeddepositaccounts/template', params),
    create:   (body)     => this._p('/fixeddepositaccounts', body),
    approve:  (id, body) => this._p(`/fixeddepositaccounts/${id}?command=approve`, body),
    undoApproval:(id)    => this._p(`/fixeddepositaccounts/${id}?command=undoapproval`, {}),
    reject:   (id, body) => this._p(`/fixeddepositaccounts/${id}?command=reject`, body),
    activate: (id, body) => this._p(`/fixeddepositaccounts/${id}?command=activate`, body),
    premature:(id, body) => this._p(`/fixeddepositaccounts/${id}?command=prematureClose`, body),
    close:    (id, body) => this._p(`/fixeddepositaccounts/${id}?command=close`, body),
    calculateInterest: (id) => this._p(`/fixeddepositaccounts/${id}?command=calculateInterest`, {}),
    postInterest: (id)   => this._p(`/fixeddepositaccounts/${id}?command=postInterest`, {})
  };
  recurringDeposits = {
    list:     (params)   => this._g('/recurringdepositaccounts', params),
    get:      (id)       => this._g(`/recurringdepositaccounts/${id}`),
    template: (params)   => this._g('/recurringdepositaccounts/template', params),
    create:   (body)     => this._p('/recurringdepositaccounts', body),
    approve:  (id, body) => this._p(`/recurringdepositaccounts/${id}?command=approve`, body),
    activate: (id, body) => this._p(`/recurringdepositaccounts/${id}?command=activate`, body),
    deposit:  (id, body) => this._p(`/recurringdepositaccounts/${id}/transactions?command=deposit`, body),
    premature:(id, body) => this._p(`/recurringdepositaccounts/${id}?command=prematureClose`, body)
  };

  // ============== SHARES ==============
  shares = {
    list:           (params)   => this._g('/accounts/share', params),
    get:            (id)       => this._g(`/accounts/share/${id}`),
    template:       ()         => this._g('/accounts/share/template'),
    create:         (body)     => this._p('/accounts/share', body),
    approve:        (id, body) => this._p(`/accounts/share/${id}?command=approve`, body),
    reject:         (id, body) => this._p(`/accounts/share/${id}?command=reject`, body),
    activate:       (id, body) => this._p(`/accounts/share/${id}?command=activate`, body),
    applyAdditional:(id, body) => this._p(`/accounts/share/${id}?command=applyadditionalshares`, body),
    redeem:         (id, body) => this._p(`/accounts/share/${id}?command=redeemshares`, body),
    close:          (id, body) => this._p(`/accounts/share/${id}?command=close`, body),
    approveShareReq:(id, body) => this._p(`/accounts/share/${id}?command=approveshare`, body),
    rejectShareReq: (id, body) => this._p(`/accounts/share/${id}?command=rejectshare`, body),
    dividends:      (id)       => this._g(`/shareproduct/${id}/dividend`),
    postDividend:   (id, body) => this._p(`/shareproduct/${id}/dividend`, body)
  };

  // ============== GROUPS & CENTERS ==============
  groups = {
    list:           (params)   => this._g('/groups', params),
    get:            (id, p)    => this._g(`/groups/${id}`, p),
    template:       ()         => this._g('/groups/template'),
    create:         (body)     => this._p('/groups', body),
    update:         (id, body) => this._u(`/groups/${id}`, body),
    activate:       (id, body) => this._p(`/groups/${id}?command=activate`, body),
    close:          (id, body) => this._p(`/groups/${id}?command=close`, body),
    assignStaff:    (id, body) => this._p(`/groups/${id}?command=assignStaff`, body),
    unassignStaff:  (id, body) => this._p(`/groups/${id}?command=unassignStaff`, body),
    assignRole:     (id, body) => this._p(`/groups/${id}?command=assignRole`, body),
    unassignRole:   (id, rid)  => this._p(`/groups/${id}?command=unassignRole&roleId=${rid}`, {}),
    associateClients:   (id, body) => this._p(`/groups/${id}?command=associateClients`, body),
    disassociateClients:(id, body) => this._p(`/groups/${id}?command=disassociateClients`, body),
    transferClients:(id, body) => this._p(`/groups/${id}?command=transferClients`, body),
    accounts:       (id)       => this._g(`/groups/${id}/accounts`),
    delete:         (id)       => this._d(`/groups/${id}`)
  };
  centers = {
    list:     (params)   => this._g('/centers', params),
    get:      (id)       => this._g(`/centers/${id}`),
    template: ()         => this._g('/centers/template'),
    create:   (body)     => this._p('/centers', body),
    update:   (id, body) => this._u(`/centers/${id}`, body),
    activate: (id, body) => this._p(`/centers/${id}?command=activate`, body),
    close:    (id, body) => this._p(`/centers/${id}?command=close`, body),
    associateGroups:    (id, body) => this._p(`/centers/${id}?command=associateGroups`, body),
    disassociateGroups: (id, body) => this._p(`/centers/${id}?command=disassociateGroups`, body)
  };

  // ============== ORGANIZATION ==============
  offices = {
    list:   (params) => this._g('/offices', params),
    get:    (id)     => this._g(`/offices/${id}`),
    template:()      => this._g('/offices/template'),
    create: (body)   => this._p('/offices', body),
    update: (id, b)  => this._u(`/offices/${id}`, b)
  };
  staff = {
    list:   (params) => this._g('/staff', params),
    get:    (id)     => this._g(`/staff/${id}`),
    create: (body)   => this._p('/staff', body),
    update: (id, b)  => this._u(`/staff/${id}`, b)
  };
  tellers = {
    list:    (params) => this._g('/tellers', params),
    get:     (id)     => this._g(`/tellers/${id}`),
    create:  (body)   => this._p('/tellers', body),
    update:  (id, b)  => this._u(`/tellers/${id}`, b),
    cashiers:(id)     => this._g(`/tellers/${id}/cashiers`),
    allocateCashier:(id, body) => this._p(`/tellers/${id}/cashiers`, body),
    settleCashier:  (id, cid, body) => this._p(`/tellers/${id}/cashiers/${cid}/settle`, body),
    allocateCashTo: (id, cid, body) => this._p(`/tellers/${id}/cashiers/${cid}/allocate`, body)
  };
  charges = {
    list:   (params) => this._g('/charges', params),
    get:    (id)     => this._g(`/charges/${id}`),
    template:()      => this._g('/charges/template'),
    create: (body)   => this._p('/charges', body),
    update: (id, b)  => this._u(`/charges/${id}`, b),
    delete: (id)     => this._d(`/charges/${id}`)
  };
  taxComponents = {
    list:   () => this._g('/taxes/component'),
    get:    (id) => this._g(`/taxes/component/${id}`),
    create: (b) => this._p('/taxes/component', b),
    update: (id, b) => this._u(`/taxes/component/${id}`, b)
  };
  taxGroups = {
    list:   () => this._g('/taxes/group'),
    get:    (id) => this._g(`/taxes/group/${id}`),
    create: (b) => this._p('/taxes/group', b),
    update: (id, b) => this._u(`/taxes/group/${id}`, b)
  };
  codes = {
    list:    ()           => this._g('/codes'),
    get:     (id)         => this._g(`/codes/${id}`),
    create:  (body)       => this._p('/codes', body),
    update:  (id, body)   => this._u(`/codes/${id}`, body),
    delete:  (id)         => this._d(`/codes/${id}`),
    values:  (id)         => this._g(`/codes/${id}/codevalues`),
    createValue: (id,body)=> this._p(`/codes/${id}/codevalues`, body),
    updateValue: (id,vid,body) => this._u(`/codes/${id}/codevalues/${vid}`, body),
    deleteValue: (id,vid) => this._d(`/codes/${id}/codevalues/${vid}`)
  };
  currencies = {
    list: () => this._g('/currencies'),
    all:  () => this._g('/currencies?fields=selectedCurrencyOptions,currencyOptions'),
    update:(body) => this._u('/currencies', body)
  };
  paymentTypes = {
    list: () => this._g('/paymenttypes'),
    get: (id) => this._g(`/paymenttypes/${id}`),
    create: (b) => this._p('/paymenttypes', b),
    update: (id, b) => this._u(`/paymenttypes/${id}`, b),
    delete: (id) => this._d(`/paymenttypes/${id}`)
  };
  holidays = {
    list:    (params) => this._g('/holidays', params),
    get:     (id)     => this._g(`/holidays/${id}`),
    template:()       => this._g('/holidays/template'),
    create:  (body)   => this._p('/holidays', body),
    update:  (id, b)  => this._u(`/holidays/${id}`, b),
    delete:  (id)     => this._d(`/holidays/${id}`),
    activate:(id)     => this._p(`/holidays/${id}?command=activate`, {})
  };
  workingDays = { get: () => this._g('/workingdays'), update: (b) => this._u('/workingdays', b) };

  // ============== PRODUCTS ==============
  loanProducts = {
    list:     ()       => this._g('/loanproducts'),
    get:      (id)     => this._g(`/loanproducts/${id}`),
    template: ()       => this._g('/loanproducts/template'),
    create:   (b)      => this._p('/loanproducts', b),
    update:   (id, b)  => this._u(`/loanproducts/${id}`, b)
  };
  savingsProducts = {
    list:     ()       => this._g('/savingsproducts'),
    get:      (id)     => this._g(`/savingsproducts/${id}`),
    template: ()       => this._g('/savingsproducts/template'),
    create:   (b)      => this._p('/savingsproducts', b),
    update:   (id, b)  => this._u(`/savingsproducts/${id}`, b)
  };
  shareProducts = {
    list:     ()       => this._g('/products/share'),
    get:      (id)     => this._g(`/products/share/${id}`),
    template: ()       => this._g('/products/share/template'),
    create:   (b)      => this._p('/products/share', b),
    update:   (id, b)  => this._u(`/products/share/${id}`, b)
  };
  fdProducts = {
    list:     ()       => this._g('/fixeddepositproducts'),
    get:      (id)     => this._g(`/fixeddepositproducts/${id}`),
    template: ()       => this._g('/fixeddepositproducts/template'),
    create:   (b)      => this._p('/fixeddepositproducts', b),
    update:   (id, b)  => this._u(`/fixeddepositproducts/${id}`, b)
  };
  rdProducts = {
    list:     ()       => this._g('/recurringdepositproducts'),
    get:      (id)     => this._g(`/recurringdepositproducts/${id}`),
    template: ()       => this._g('/recurringdepositproducts/template'),
    create:   (b)      => this._p('/recurringdepositproducts', b),
    update:   (id, b)  => this._u(`/recurringdepositproducts/${id}`, b)
  };
  productMix = {
    list:     (id)     => this._g(`/loanproducts/${id}/productmix`),
    create:   (id, b)  => this._p(`/loanproducts/${id}/productmix`, b),
    update:   (id, b)  => this._u(`/loanproducts/${id}/productmix`, b),
    delete:   (id)     => this._d(`/loanproducts/${id}/productmix`)
  };
  floatingRates = {
    list:   ()        => this._g('/floatingrates'),
    get:    (id)      => this._g(`/floatingrates/${id}`),
    create: (b)       => this._p('/floatingrates', b),
    update: (id, b)   => this._u(`/floatingrates/${id}`, b)
  };
  delinquencyBuckets = {
    list:    () => this._g('/delinquency/buckets'),
    create:  (b) => this._p('/delinquency/buckets', b),
    ranges:  () => this._g('/delinquency/ranges'),
    createRange: (b) => this._p('/delinquency/ranges', b)
  };
  collateralManagement = {
    list:   () => this._g('/collateral-management'),
    create: (b) => this._p('/collateral-management', b),
    update: (id, b) => this._u(`/collateral-management/${id}`, b)
  };

  // ============== ACCOUNTING ==============
  journalEntries = {
    list:    (params)  => this._g('/journalentries', params),
    create:  (body)    => this._p('/journalentries', body),
    reverse: (txId, b) => this._p(`/journalentries/${txId}?command=reverse`, b || {})
  };
  glAccounts = {
    list:   (params) => this._g('/glaccounts', params),
    get:    (id)     => this._g(`/glaccounts/${id}`),
    template:()      => this._g('/glaccounts/template'),
    create: (body)   => this._p('/glaccounts', body),
    update: (id, b)  => this._u(`/glaccounts/${id}`, b),
    delete: (id)     => this._d(`/glaccounts/${id}`)
  };
  glClosures = {
    list: () => this._g('/glclosures'),
    get:  (id) => this._g(`/glclosures/${id}`),
    create: (b) => this._p('/glclosures', b),
    update: (id, b) => this._u(`/glclosures/${id}`, b),
    delete: (id) => this._d(`/glclosures/${id}`)
  };
  accountingRules = {
    list: () => this._g('/accountingrules'),
    get: (id) => this._g(`/accountingrules/${id}`),
    create: (b) => this._p('/accountingrules', b),
    update: (id, b) => this._u(`/accountingrules/${id}`, b),
    delete: (id) => this._d(`/accountingrules/${id}`)
  };
  provisioning = {
    entries:        ()     => this._g('/provisioningentries'),
    criteria:       ()     => this._g('/provisioningcriteria'),
    createCriteria: (b)    => this._p('/provisioningcriteria', b),
    updateCriteria: (id,b) => this._u(`/provisioningcriteria/${id}`, b),
    deleteCriteria: (id)   => this._d(`/provisioningcriteria/${id}`),
    createEntry:    (b)    => this._p('/provisioningentries', b),
    createJournal:  (id)   => this._p(`/provisioningentries/${id}?command=createjournalentry`, {})
  };
  financialActivityAccounts = {
    list:   ()     => this._g('/financialactivityaccounts'),
    get:    (id)   => this._g(`/financialactivityaccounts/${id}`),
    create: (body) => this._p('/financialactivityaccounts', body),
    update: (id, b) => this._u(`/financialactivityaccounts/${id}`, b),
    delete: (id)   => this._d(`/financialactivityaccounts/${id}`)
  };
  accountingClosure = {
    list: () => this._g('/glclosures'),
    create: (b) => this._p('/glclosures', b)
  };

  // ============== REPORTS ==============
  reports = {
    list:   ()  => this._g('/reports'),
    get:    (id) => this._g(`/reports/${id}`),
    create: (b) => this._p('/reports', b),
    update: (id, b) => this._u(`/reports/${id}`, b),
    delete: (id) => this._d(`/reports/${id}`)
  };
  runReports = {
    run: (name, params) => this._g(`/runreports/${encodeURIComponent(name)}`,
                                   { parameterType: 'true', ...params })
  };
  adhocQueries = {
    list:    () => this._g('/adhocquery'),
    get:     (id) => this._g(`/adhocquery/${id}`),
    create:  (b) => this._p('/adhocquery', b),
    update:  (id, b) => this._u(`/adhocquery/${id}`, b),
    delete:  (id) => this._d(`/adhocquery/${id}`),
    runAll:  () => this._p('/adhocquery?command=execute', {})
  };

  // ============== USERS, ROLES, PERMISSIONS ==============
  users = {
    list:   ()       => this._g('/users'),
    get:    (id)     => this._g(`/users/${id}`),
    template:()      => this._g('/users/template'),
    create: (body)   => this._p('/users', body),
    update: (id, b)  => this._u(`/users/${id}`, b),
    delete: (id)     => this._d(`/users/${id}`)
  };
  roles = {
    list:       ()         => this._g('/roles'),
    get:        (id)       => this._g(`/roles/${id}`),
    create:     (body)     => this._p('/roles', body),
    update:     (id, b)    => this._u(`/roles/${id}`, b),
    delete:     (id)       => this._d(`/roles/${id}`),
    enable:     (id)       => this._p(`/roles/${id}?command=enable`, {}),
    disable:    (id)       => this._p(`/roles/${id}?command=disable`, {}),
    permissions:(id)       => this._g(`/roles/${id}/permissions`),
    updatePermissions:(id, b) => this._u(`/roles/${id}/permissions`, b)
  };
  permissions = {
    list: () => this._g('/permissions'),
    update: (b) => this._u('/permissions', b)
  };

  // ============== JOBS, AUDITS, MAKERCHECKER ==============
  jobs = {
    list:    ()        => this._g('/jobs'),
    get:     (id)      => this._g(`/jobs/${id}`),
    update:  (id, b)   => this._u(`/jobs/${id}`, b),
    runJob:  (id)      => this._p(`/jobs/${id}?command=executeJob`, {}),
    history: (id, params) => this._g(`/jobs/${id}/runhistory`, params),
    schedule:(id, b)   => this._u(`/jobs/${id}/schedulername`, b)
  };
  audits = {
    list:           (params) => this._g('/audits', params),
    get:            (id)     => this._g(`/audits/${id}`),
    searchTemplate: ()       => this._g('/audits/searchtemplate')
  };
  makerchecker = {
    list:    (params) => this._g('/makercheckers', params),
    template:()       => this._g('/makercheckers/searchtemplate'),
    approve: (id)     => this._p(`/makercheckers/${id}?command=approve`, {}),
    reject:  (id)     => this._p(`/makercheckers/${id}?command=reject`, {}),
    delete:  (id)     => this._d(`/makercheckers/${id}`)
  };

  // ============== CONFIGURATION ==============
  configurations = {
    list:   ()             => this._g('/configurations'),
    get:    (name)         => this._g(`/configurations/name/${encodeURIComponent(name)}`),
    update: (id, body)     => this._u(`/configurations/${id}`, body),
    cache:  () => this._g('/configurations/cache'),
    updateCache: (b) => this._u('/configurations/cache', b),
    globalConfig: {
      list:   ()           => this._g('/configurations'),
      update: (id, body)   => this._u(`/configurations/${id}`, body)
    }
  };

  // ============== NOTIFICATIONS, HOOKS, EXTERNAL SVC ==============
  notifications = {
    list:     (params) => this._g('/notifications', params),
    get:      (id)     => this._g(`/notifications/${id}`),
    markRead: (id)     => this._u(`/notifications/${id}`, { isRead: true })
  };
  hooks = {
    list:    ()        => this._g('/hooks'),
    get:     (id)      => this._g(`/hooks/${id}`),
    template:()        => this._g('/hooks/template'),
    create:  (b)       => this._p('/hooks', b),
    update:  (id, b)   => this._u(`/hooks/${id}`, b),
    delete:  (id)      => this._d(`/hooks/${id}`)
  };
  externalServices = {
    sms:        { list: () => this._g('/externalservice/SMS'),        update: (b) => this._u('/externalservice/SMS', b) },
    email:      { list: () => this._g('/externalservice/SMTP'),       update: (b) => this._u('/externalservice/SMTP', b) },
    smtpEmail:  { list: () => this._g('/externalservice/SMTP'),       update: (b) => this._u('/externalservice/SMTP', b) },
    s3:         { list: () => this._g('/externalservice/S3'),         update: (b) => this._u('/externalservice/S3', b) },
    notification:{list: () => this._g('/externalservice/NOTIFICATION'),update: (b) => this._u('/externalservice/NOTIFICATION', b) }
  };
  externalEvents = {
    list: (params) => this._g('/externalevents', params),
    configurations: () => this._g('/externalevents/configuration'),
    updateConfig: (b) => this._u('/externalevents/configuration', b)
  };
  smsCampaigns = {
    list: () => this._g('/smscampaigns'),
    get: (id) => this._g(`/smscampaigns/${id}`),
    template: () => this._g('/smscampaigns/template'),
    create: (b) => this._p('/smscampaigns', b),
    update: (id, b) => this._u(`/smscampaigns/${id}`, b),
    delete: (id) => this._d(`/smscampaigns/${id}`),
    activate: (id) => this._p(`/smscampaigns/${id}?command=activate`, {}),
    close: (id) => this._p(`/smscampaigns/${id}?command=close`, {}),
    reactivate: (id) => this._p(`/smscampaigns/${id}?command=reactivate`, {})
  };

  // ============== DATA TABLES, SURVEYS, SELF-SERVICE ==============
  dataTables = {
    list:       ()                 => this._g('/datatables'),
    get:        (name)             => this._g(`/datatables/${name}`),
    register:   (name, app, body)  => this._p(`/datatables/register/${name}/${app}`, body),
    deregister: (name)             => this._p(`/datatables/deregister/${name}`, {}),
    query:      (name, entityId)   => this._g(`/datatables/${name}/${entityId}`),
    create:     (body)             => this._p('/datatables', body),
    update:     (name, eid, body)  => this._u(`/datatables/${name}/${eid}`, body),
    delete:     (name, eid)        => this._d(`/datatables/${name}/${eid}`),
    deleteTable:(name)             => this._d(`/datatables/${name}`)
  };
  surveys = {
    list: () => this._g('/surveys'),
    get:  (id) => this._g(`/surveys/${id}`),
    fullDetail: (id) => this._g(`/surveys/${id}/scorecards`)
  };
  selfService = {
    users:        ()      => this._g('/self/userdetails'),
    register:     (body)  => this._p('/self/registration', body),
    activate:     (body)  => this._p('/self/registration/user', body),
    resetPassword:(body)  => this._p('/self/registration/resetpassword', body),
    beneficiaries:()      => this._g('/self/beneficiaries/tpt'),
    addBeneficiary:(body) => this._p('/self/beneficiaries/tpt', body),
    updateBeneficiary:(id, b) => this._u(`/self/beneficiaries/tpt/${id}`, b),
    deleteBeneficiary:(id) => this._d(`/self/beneficiaries/tpt/${id}`)
  };

  // ============== SEARCH ==============
  search = {
    search: (query, resource = 'clients,loans,groups') =>
      this._g('/search', { query, resource }),
    advanced: (body) => this._p('/search/advance', body)
  };

  // ============== TRANSFERS, STANDING INSTRUCTIONS ==============
  transfers = {
    list:    (params) => this._g('/accounttransfers', params),
    create:  (body)   => this._p('/accounttransfers', body),
    refund:  (body)   => this._p('/accounttransfers/refundByTransfer', body),
    template:(params) => this._g('/accounttransfers/template', params),
    get:     (id)     => this._g(`/accounttransfers/${id}`)
  };
  standingInstructions = {
    list:    (params)  => this._g('/standinginstructions', params),
    get:     (id)      => this._g(`/standinginstructions/${id}`),
    template:(params)  => this._g('/standinginstructions/template', params),
    create:  (body)    => this._p('/standinginstructions', body),
    update:  (id, b)   => this._u(`/standinginstructions/${id}`, b),
    delete:  (id)      => this._d(`/standinginstructions/${id}`),
    history: (params)  => this._g('/standinginstructionrunhistory', params)
  };

  // ============== COB (Close of Business) ==============
  cob = {
    configurations: () => this._g('/cob-configurations'),
    updateConfig:   (id, body) => this._u(`/cob-configurations/${id}`, body),
    businessDate: {
      get: () => this._g('/businessdate'),
      set: (body) => this._u('/businessdate', body)
    },
    catchUp: () => this._p('/loans/catch-up-processing', {})
  };

  // ============== BULK IMPORTS ==============
  bulkImports = {
    template: (entity)        => this._g(`/${entity}/downloadtemplate`),
    upload:   (entity, body)  => this._p(`/${entity}/uploadtemplate`, body),
    list:     (entity)        => this._g(`/${entity}/importtemplate`, { entity })
  };

  // ============== CATCH-ALL ==============
  any(method, path, params, body) { return this._req(method, path, { params, body }); }
}

export const api = new FineractAPI();
export function configureAPI(c) { api.configure(c); }
=======
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
>>>>>>> 18cfd05 (Replace repository contents with provided js.zip extract)
