<<<<<<< HEAD
# FinCraft v2 — Apache Fineract Web UI

 A modular, modern web frontend for [Apache Fineract](https://fineract.apache.org/) — the open-source microfinance platform.
 ## Live Demo
 [https://gprocessor.github.io/fincraft](https://gprocessor.github.io/fincraft)

 Connects to the public Fineract demo server at **demo.mifos.io**  
 Default credentials: `mifos` / `password` · Tenant: `default`

 ---
 ## Features
 - 📊 **Dashboard** — live KPIs: clients, loans, savings, pending tasks
 - 👥 **Clients** — search, filter by office/status, activate, export CSV
 - 💰 **Loans** — portfolio view, inline approve, repayment posting
 - 🏦 **Savings / Deposits / Shares** — full account management
 - 🔁 **Transfers** — account-to-account, standing instructions
 - 📒 **Accounting** — Chart of Accounts, journal entries, GL closures, rules
 - 🏢 **Organization** — offices, staff, tellers, holidays, currencies, payment types
 - 📦 **Products** — loan, savings, FD, RD, share products and charges
 - ✅ **Checker Inbox** — maker-checker approval workflow
 - 📈 **Reports** — standard Fineract reports with run parameters
 - 🔍 **Global Search** — clients, loans, groups via `/search`
 ## Architecture
 ```
 js/
  app.js          — bootstrap + service worker
  auth.js         — login/logout (Basic auth → Fineract token)
  api.js          — full Fineract REST client (100+ endpoints)
   pages/
     dashboard.js, clients.js, loans.js, savings.js, deposits.js,
     shares.js, groups.js, centers.js, collections.js, transfers.js,
 ## Project Structure
 ```
 fincraft-v2/
 ├── index.html              ← Entry point (loads all modules)
 ├── css/
 │   ├── tokens.css          ← Design tokens, theme variables, keyframes
 ├── pages/
 │   ├── login.html          ← Login + demo server auto-connect
 │   ├── shell.html          ← App shell: sidebar (25 nav items) + topbar
 └── modals/
   ├── create.html         ← New Client, Loan, Savings, FD, Share, Group,
   │                          Center, Transfer, Remittance, Bulk Import
 ## Deployment & Local Development

 ### Local Development
 ```bash
 # Any static file server works — no build step
 npx serve .
 # or
 python3 -m http.server 8080
 ```

 ### Option A — Any Static Web Server (recommended)
 ```bash
 # Python (built-in)
 cd fincraft-v2
 python3 -m http.server 8080

 # Node.js serve
 npx serve fincraft-v2

 # nginx / Apache
 # Just point document root at fincraft-v2/
 ```

 ### Option B — Netlify / Vercel / GitHub Pages
 Drop the `fincraft-v2/` folder — no build step needed.

 ### Option C — Docker
 ```dockerfile
 FROM nginx:alpine
 COPY fincraft-v2/ /usr/share/nginx/html/
 EXPOSE 80
 ```

 ## Demo Server
 Auto-connects on load to:
 - **Server:** https://demo.mifos.community (demo.mifos.io)
 - **Tenant:** default
 - **Username:** mifos / **Password:** password

 To connect to your own Fineract instance, update `js/config.js`:
 ```js
 DEMO_SERVER_URL : 'https://your-fineract-server.com',
 DEMO_TENANT     : 'your-tenant',
 DEMO_USERNAME   : 'admin',
 DEMO_PASSWORD   : 'password',
 ```

 ---
 Built by **Processor** Power Platform & MIS Division
<<<<<<< HEAD
# FinCraft  Apache Fineract Web UI

A modular, modern web frontend for [Apache Fineract](https://fineract.apache.org/) — the open-source microfinance platform.

## Live Demo
[https://gprocessor.github.io/fincraft](https://gprocessor.github.io/fincraft)

Connects to the public Fineract demo server at **demo.mifos.io**  
Default credentials: `mifos` / `password` · Tenant: `default`

---

## Features
- 📊 **Dashboard** — live KPIs: clients, loans, savings, pending tasks
- 👥 **Clients** — search, filter by office/status, activate, export CSV
- 💰 **Loans** — portfolio view, inline approve, repayment posting
- 🏦 **Savings / Deposits / Shares** — full account management
- 🔁 **Transfers** — account-to-account, standing instructions
- 📒 **Accounting** — Chart of Accounts, journal entries, GL closures, rules
- 🏢 **Organization** — offices, staff, tellers, holidays, currencies, payment types
- 📦 **Products** — loan, savings, FD, RD, share products and charges
- ✅ **Checker Inbox** — maker-checker approval workflow
- 📈 **Reports** — standard Fineract reports with run parameters
- 🔍 **Global Search** — clients, loans, groups via `/search`
- ⚙️ **System** — configurations, audit trail, roles, scheduled jobs

## Architecture
```
js/
  app.js          — bootstrap + service worker
  auth.js         — login/logout (Basic auth → Fineract token)
  api.js          — full Fineract REST client (100+ endpoints)
  config.js       — server URL, tenant, timeouts
  router.js       — hash-based SPA router
  store.js        — localStorage state (auth, theme, sidebar)
  ui.js           — shell, modals, toasts, form submission handlers
  modal-init.js   — GL account population, inline client search
  utils.js        — fmt, num, fmtDate, sb, ini, debounce, escapeHtml
  data.js         — empty (no demo data)
  pages/
    dashboard.js, clients.js, loans.js, savings.js, deposits.js,
    shares.js, groups.js, centers.js, collections.js, transfers.js,
    accounting.js, reports.js, tasks.js, products.js, organization.js,
    system.js, analytics.js, search.js, misc.js
views/
  modals.html     — all modal forms (lazy-loaded at mount)
css/
  app.css         — design tokens, components, dark mode
```

## Deploy to Your Own Fineract Instance
1. Fork this repo
2. Edit `js/config.js` — change `serverUrl` and `tenantId`
3. Push to `main` — GitHub Actions deploys automatically

## Local Development
```bash
# Any static file server works — no build step
npx serve .
# or
python3 -m http.server 8080
```

## GitHub Pages Setup
1. Go to **Settings → Pages**
2. Source: **GitHub Actions**
3. Push to `main` — workflow auto-deploys

---
Built by **Processor** Power Platform & MIS Division
=======
# finecraft
>>>>>>> 6caff27 (Initial commit)
=======
# FinCraft v2 — Apache Fineract Unified Platform

A fully modular microfinance web application built on Apache Fineract.
**Auto-connects to `https://demo.mifos.community`** on first load.

## Project Structure

```
fincraft-v2/
├── index.html              ← Entry point (loads all modules)
├── css/
│   ├── tokens.css          ← Design tokens, theme variables, keyframes
│   └── components.css      ← Full UI component library
├── js/
│   ├── config.js           ← Server config, all API endpoint paths
│   ├── api.js              ← Live Fineract REST client (all endpoints)
│   ├── app.js              ← Core: auth, router, toast, modal, theme
│   ├── pages.js            ← All page controllers (live API, no demo data)
│   ├── cmd.js              ← Command palette (50+ commands, Ctrl+K)
│   └── forms.js            ← Form population from API templates + submissions
├── pages/
│   ├── login.html          ← Login + demo server auto-connect
│   ├── shell.html          ← App shell: sidebar (25 nav items) + topbar
│   ├── dashboard.html      ← KPIs, charts, tasks, recent clients
│   ├── clients.html        ← Client list + client detail (12 tabs)
│   ├── loans.html          ← Loan list + loan detail (10 tabs, 15 actions)
│   ├── savings.html        ← Savings, Deposits, Shares, Collaterals
│   ├── groups.html         ← Groups, Centers, Collections, Transfers, Remittances
│   ├── accounting.html     ← Accounting (10 tabs: COA, JE, rules, closure…)
│   ├── tasks.html          ← Checker inbox, Reports, Surveys, Products, Organization
│   └── system.html         ← System, Users, Templates, Self Service, Analytics,
│                              Navigation Tree, Search, Notifications, Profile, Settings
└── modals/
    ├── create.html         ← New Client, Loan, Savings, FD, Share, Group,
    │                          Center, Transfer, Remittance, Bulk Import
    └── actions.html        ← Repayment, Journal Entry, Reschedule, Write-Off,
                               Interest Pause, Collateral, GL Account, Charge, Tax,
                               SMS Campaign, 2FA, Self Service User, Config Wizard,
                               Run Report, Report Output, Ad Hoc Query,
                               Savings Detail, FD Detail, Group Detail,
                               Toast Container, Command Palette
```

## Deployment

### Option A — Any Static Web Server (recommended)
```bash
# Python (built-in)
cd fincraft-v2
python3 -m http.server 8080

# Node.js serve
npx serve fincraft-v2

# nginx / Apache
# Just point document root at fincraft-v2/
```
Open: http://localhost:8080

### Option B — Netlify / Vercel / GitHub Pages
Drop the `fincraft-v2/` folder — no build step needed.

### Option C — Docker
```dockerfile
FROM nginx:alpine
COPY fincraft-v2/ /usr/share/nginx/html/
EXPOSE 80
```

## Demo Server
Auto-connects on load to:
- **Server:** https://demo.mifos.community
- **Tenant:** default
- **Username:** mifos / **Password:** password

To connect to your own Fineract instance, update `js/config.js`:
```js
DEMO_SERVER_URL : 'https://your-fineract-server.com',
DEMO_TENANT     : 'your-tenant',
DEMO_USERNAME   : 'admin',
DEMO_PASSWORD   : 'password',
```

## Key Features
- 30 pages, 30 modals, 25 nav items, 81+ tab buttons
- Live Fineract REST API — every table and form calls real endpoints
- Command Palette (Ctrl+K) — 50+ commands
- Dark / Light theme with localStorage persistence
- Keyboard shortcuts: Ctrl+K, Ctrl+Shift+N/L/R, ESC, ?
- Collapsible sidebar, global search, toast notifications
- Zero build tools — vanilla HTML + CSS + JavaScript
- Modular: each section is an independent file
>>>>>>> 18cfd05 (Replace repository contents with provided js.zip extract)
