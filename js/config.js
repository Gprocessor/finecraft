<<<<<<< HEAD
/* FinCraft · config.js
   Points to the Apache Fineract community demo server.
   CORS note: the demo server at demo.mifos.io has open CORS headers.
   tenant: default  user: mifos  pass: password
   NOTE: this public demo server can be slow to respond, especially on the
   first request after a period of inactivity (server may be waking from
   idle / cold-starting). Timeouts below are set generously to accommodate
   this rather than failing fast. */
export const FINERACT_DEMO = {
  serverUrl:  'https://132.226.213.96:8443',
  tenantId:   'default',
  apiBase:    '/fineract-provider/api/v1',
  requestTimeoutMs:     45000,
  autoConnectTimeoutMs: 45000
};

export function getRuntimeConfig() {
  return {
    apiBase:              FINERACT_DEMO.apiBase,
    requestTimeoutMs:     FINERACT_DEMO.requestTimeoutMs,
    autoConnectTimeoutMs: FINERACT_DEMO.autoConnectTimeoutMs
  };
}
=======
/**
 * FinCraft — config.js
 * Central configuration: server URLs, credentials, API paths, app settings
 */

window.FC_CONFIG = {
  /* ── Demo Server (Mifos Community) ─────────────────────── */
  DEMO_SERVER_URL : 'https://demo.mifos.community',
  DEMO_TENANT     : 'default',
  DEMO_USERNAME   : 'mifos',
  DEMO_PASSWORD   : 'password',

  /* ── API Path ───────────────────────────────────────────── */
  API_PROVIDER : '/fineract-provider/api',
  API_VERSION  : '/v1',

  /* Builds: https://demo.mifos.community/fineract-provider/api/v1 */
  get API_BASE() {
    return `${this.SERVER_URL}${this.API_PROVIDER}${this.API_VERSION}`;
  },

  /* ── Runtime State (set after login) ────────────────────── */
  SERVER_URL  : 'https://demo.mifos.community',
  TENANT_ID   : 'default',
  USERNAME    : '',
  AUTH_TOKEN  : null,   /* base64(user:pass) after login */
  USER_ROLES  : [],

  /* ── UI Settings ────────────────────────────────────────── */
  DEFAULT_THEME         : 'dark',
  NOTIFICATIONS_POLL_MS : 60000,
  PAGE_SIZE             : 50,

  /* ── All Fineract REST Endpoints ─────────────────────────── */
  ENDPOINTS: {
    /* Auth */
    AUTH             : '/authentication',

    /* Clients */
    CLIENTS          : '/clients',
    CLIENT           : (id) => `/clients/${id}`,
    CLIENT_ACCOUNTS  : (id) => `/clients/${id}/accounts`,
    CLIENT_CHARGES   : (id) => `/clients/${id}/charges`,
    CLIENT_TEMPLATE  : '/clients/template',
    CLIENT_IDENTIFIERS:(id)=> `/clients/${id}/identifiers`,
    CLIENT_IMAGES    : (id) => `/clients/${id}/images`,
    CLIENT_NOTES     : (id) => `/clients/${id}/notes`,
    CLIENT_DOCUMENTS : (id) => `/clients/${id}/documents`,
    CLIENT_FAMILY    : (id) => `/clients/${id}/familymembers`,
    CLIENT_ACTION    : (id, action) => `/clients/${id}?command=${action}`,

    /* Loans */
    LOANS            : '/loans',
    LOAN             : (id) => `/loans/${id}`,
    LOAN_TEMPLATE    : '/loans/template',
    LOAN_REPAYMENT_SCHEDULE: (id) => `/loans/${id}/repaymentschedule`,
    LOAN_TRANSACTIONS: (id) => `/loans/${id}/transactions`,
    LOAN_CHARGES     : (id) => `/loans/${id}/charges`,
    LOAN_COLLATERAL  : (id) => `/loans/${id}/collaterals`,
    LOAN_GUARANTORS  : (id) => `/loans/${id}/guarantors`,
    LOAN_NOTES       : (id) => `/loans/${id}/notes`,
    LOAN_DOCUMENTS   : (id) => `/loans/${id}/documents`,
    LOAN_DELINQUENCY : (id) => `/loans/${id}/delinquencytags`,
    LOAN_STANDING    : (id) => `/standinginstructions?loanId=${id}`,
    LOAN_ACTION      : (id, action) => `/loans/${id}?command=${action}`,
    /* Loan actions: approve, reject, disburse, undoapproval, undodisbursal,
       repayment, waiveinterest, writeoff, close, reschedule,
       assign-delinquency, foreclosure, recoverGuarantees */

    /* Savings */
    SAVINGS          : '/savingsaccounts',
    SAVING           : (id) => `/savingsaccounts/${id}`,
    SAVINGS_TEMPLATE : '/savingsaccounts/template',
    SAVINGS_TRANSACTIONS: (id) => `/savingsaccounts/${id}/transactions`,
    SAVINGS_CHARGES  : (id) => `/savingsaccounts/${id}/charges`,
    SAVINGS_NOTES    : (id) => `/savingsaccounts/${id}/notes`,
    SAVINGS_DOCUMENTS: (id) => `/savingsaccounts/${id}/documents`,
    SAVINGS_ACTION   : (id, action) => `/savingsaccounts/${id}?command=${action}`,
    /* Savings actions: approve, activate, withdraw, deposit, holdamount,
       releaseamount, blockaccount, unblockaccount, close */

    /* Fixed Deposits */
    FIXED_DEPOSITS   : '/fixeddepositaccounts',
    FIXED_DEPOSIT    : (id) => `/fixeddepositaccounts/${id}`,
    FD_TRANSACTIONS  : (id) => `/fixeddepositaccounts/${id}/transactions`,
    FD_ACTION        : (id, action) => `/fixeddepositaccounts/${id}?command=${action}`,

    /* Recurring Deposits */
    REC_DEPOSITS     : '/recurringdepositaccounts',
    REC_DEPOSIT      : (id) => `/recurringdepositaccounts/${id}`,
    RD_ACTION        : (id, action) => `/recurringdepositaccounts/${id}?command=${action}`,

    /* Shares */
    SHARE_ACCOUNTS   : '/shareaccounts',
    SHARE_ACCOUNT    : (id) => `/shareaccounts/${id}`,
    SHARE_ACTION     : (id, action) => `/shareaccounts/${id}?command=${action}`,

    /* Groups */
    GROUPS           : '/groups',
    GROUP            : (id) => `/groups/${id}`,
    GROUP_ACCOUNTS   : (id) => `/groups/${id}/accounts`,
    GROUP_NOTES      : (id) => `/groups/${id}/notes`,
    GROUP_ACTION     : (id, action) => `/groups/${id}?command=${action}`,

    /* Centers */
    CENTERS          : '/centers',
    CENTER           : (id) => `/centers/${id}`,
    CENTER_ACCOUNTS  : (id) => `/centers/${id}/accounts`,

    /* Account Transfers */
    TRANSFERS        : '/accounttransfers',
    TRANSFER         : (id) => `/accounttransfers/${id}`,
    TRANSFERS_TEMPLATE: '/accounttransfers/template',

    /* Accounting */
    GL_ACCOUNTS      : '/glaccounts',
    GL_ACCOUNT       : (id) => `/glaccounts/${id}`,
    JOURNAL_ENTRIES  : '/journalentries',
    JOURNAL_ENTRY    : (id) => `/journalentries/${id}`,
    GL_CLOSURE       : '/glclosures',
    ACCRUALS         : '/periodicaccrualaccounting',
    PROVISIONING     : '/provisioningentries',
    FIN_ACTIVITY     : '/financialactivityaccounts',
    ACCOUNTING_RULES : '/accountingrules',
    MIGRATE_BALANCES : '/journalentries?command=updateRunningBalance',
    FREQUENT_POSTINGS: '/frequentpostings',

    /* Checker Inbox */
    MAKER_CHECKERS   : '/makercheckers',
    MAKER_CHECKER    : (id) => `/makercheckers/${id}`,
    MC_APPROVE       : (id) => `/makercheckers/${id}?command=approve`,
    MC_REJECT        : (id) => `/makercheckers/${id}?command=reject`,

    /* Reports */
    REPORTS          : '/reports',
    RUN_REPORT       : (name) => `/runreports/${encodeURIComponent(name)}`,

    /* Products */
    LOAN_PRODUCTS    : '/loanproducts',
    LOAN_PRODUCT     : (id) => `/loanproducts/${id}`,
    SAVINGS_PRODUCTS : '/savingsproducts',
    SAVINGS_PRODUCT  : (id) => `/savingsproducts/${id}`,
    FD_PRODUCTS      : '/fixeddepositproducts',
    RD_PRODUCTS      : '/recurringdepositproducts',
    SHARE_PRODUCTS   : '/shareproducts',
    CHARGES          : '/charges',
    CHARGE           : (id) => `/charges/${id}`,
    TAX_COMPONENTS   : '/taxes/component',
    TAX_GROUPS       : '/taxes/group',
    DELINQUENCY_BUCKETS: '/delinquency/buckets',
    FLOATING_RATES   : '/floatingrates',
    COLLATERAL_MGMT  : '/collateral-management',
    PRODUCTS_MIX     : '/loanproductsdemix',

    /* Organization */
    OFFICES          : '/offices',
    OFFICE           : (id) => `/offices/${id}`,
    STAFF            : '/staff',
    STAFF_MEMBER     : (id) => `/staff/${id}`,
    TELLERS          : '/tellers',
    TELLER           : (id) => `/tellers/${id}`,
    HOLIDAYS         : '/holidays',
    WORKING_DAYS     : '/workingdays',
    CURRENCIES       : '/currencies',
    PAYMENT_TYPES    : '/paymenttypes',
    SMS_CAMPAIGNS    : '/smscampaigns',
    INVESTORS        : '/externalassetowners',
    LOAN_ORIGINATORS : '/loanoriginators',
    FUNDS            : '/funds',
    PASSWORD_PREFS   : '/passwordpreferences',
    ENTITY_CHECKS    : '/entityDatatableChecks',
    BULK_REASSIGN    : '/loans/loanreassignment',

    /* System */
    CONFIGURATIONS   : '/configurations',
    CONFIGURATION    : (id) => `/configurations/${id}`,
    DATA_TABLES      : '/datatables',
    AUDIT_TRAILS     : '/audits',
    CODES            : '/codes',
    CODE_VALUES      : (id) => `/codes/${id}/codevalues`,
    ROLES            : '/roles',
    ROLE             : (id) => `/roles/${id}`,
    ROLE_PERMISSIONS : (id) => `/roles/${id}/permissions`,
    USERS            : '/users',
    USER             : (id) => `/users/${id}`,
    EXTERNAL_SERVICES: '/externalservice',
    EXTERNAL_EVENTS  : '/externalevents',
    JOBS             : '/jobs',
    JOB              : (id) => `/jobs/${id}`,
    JOB_RUN          : (id) => `/jobs/${id}?command=executeJob`,
    HOOKS            : '/hooks',
    HOOK             : (id) => `/hooks/${id}`,
    ENTITY_MAPPING   : '/entitytoentitymapping',
    SURVEYS          : '/surveys',
    ADHOC_QUERY      : '/adhocquery',
    NOTIFICATIONS    : '/notifications',
    SYSTEM_INFO      : '/serverinfo',
    TWO_FACTOR       : '/twofactor',

    /* Templates */
    TEMPLATES        : '/templates',

    /* Self Service */
    SS_USERS         : '/self/clients',
    SS_BENEFICIARIES : '/self/beneficiaries/tpt',

    /* Collaterals (client-level) */
    COLLATERALS      : (clientId) => `/clients/${clientId}/collaterals`,
    COLLATERAL       : (clientId, colId) => `/clients/${clientId}/collaterals/${colId}`,

    /* Loan Reschedule */
    LOAN_RESCHEDULE  : '/rescheduleloans',

    /* Documents */
    DOCUMENTS        : (entity, id) => `/${entity}/${id}/documents`,
  },
};
>>>>>>> 18cfd05 (Replace repository contents with provided js.zip extract)
