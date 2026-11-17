# Cashihan

Personal finance tracker with accounts, income, expenses, transfers, reports, and monthly budgets.

## Run locally

Use Node.js 24 or later:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and create an account. Without Turso settings, data is stored in SQLite at `.data/cashihan.sqlite`. Set `CASHIHAN_DB_PATH` to an absolute path to use another local location.

## Deploy

For Vercel, connect a Turso Cloud database through the Vercel Marketplace. Its integration adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the project. Set both for Production, Preview, and Development environments as needed, then redeploy. The app creates its tables on its first database connection. Do not deploy on Vercel without these settings: its filesystem cannot preserve the local SQLite file. Keep the token in environment variables, never in source control.

For a Node.js server with persistent disk storage, the local SQLite path still works. Back up the database regularly. The PWA can be installed from a site served over HTTPS; it still needs a connection to load and save account data.

When an existing browser first signs in to an empty account, Cashihan attempts to import its old local accounts, transactions, and budgets into SQLite. Local data is removed only after a successful import.
