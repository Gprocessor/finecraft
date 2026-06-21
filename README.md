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
