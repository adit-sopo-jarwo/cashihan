import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

let database: Database.Database | undefined;

export function getDb() {
    if (database) return database;
    const path = resolve(/* turbopackIgnore: true */ process.env.CASHIHAN_DB_PATH || join(process.cwd(), ".data", "cashihan.sqlite"));
    mkdirSync(dirname(path), { recursive: true });
    database = new Database(path);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            number TEXT NOT NULL DEFAULT '',
            opening_balance INTEGER NOT NULL DEFAULT 0 CHECK(opening_balance >= 0)
        );
        CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
            account_id TEXT NOT NULL REFERENCES accounts(id),
            destination_id TEXT REFERENCES accounts(id),
            amount INTEGER NOT NULL CHECK(amount > 0),
            title TEXT,
            note TEXT NOT NULL DEFAULT '',
            date TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_id, date DESC);
        CREATE TABLE IF NOT EXISTS budgets (
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            month TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK(amount >= 0),
            PRIMARY KEY(user_id, month)
        );
    `);
    return database;
}
