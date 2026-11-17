# Cashihan

Personal finance tracker with accounts, income, expenses, transfers, reports, and monthly budgets.

## Run locally

Use Node.js 24 or later:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and create an account. Data is stored in SQLite at `.data/cashihan.sqlite` by default. Set `CASHIHAN_DB_PATH` to an absolute path on a persistent disk to use another location.

## Deploy

Build with `npm run build` and run with `npm start` on a Node.js server that has persistent disk storage. Back up the SQLite file regularly. An ephemeral serverless filesystem will not preserve the database across deployments or restarts. The PWA can be installed from a site served over HTTPS; it still needs a connection to load and save account data.

When an existing browser first signs in to an empty account, Cashihan attempts to import its old local accounts, transactions, and budgets into SQLite. Local data is removed only after a successful import.
