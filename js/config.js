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
