import { createClient, type Client, type Transaction } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type DbConnection = Client | Transaction;
export type DbArgs = Array<string | number | null>;

let database: Promise<Client> | undefined;

async function openDb() {
    const remoteUrl = process.env.TURSO_DATABASE_URL;
    const remoteToken = process.env.TURSO_AUTH_TOKEN;
    if (process.env.VERCEL && (!remoteUrl || !remoteToken)) {
        throw new Error("Turso database settings are missing in Vercel.");
    }
    if (remoteUrl && !remoteToken) throw new Error("TURSO_AUTH_TOKEN is required.");

    const localPath = resolve(/* turbopackIgnore: true */ process.env.CASHIHAN_DB_PATH || join(process.cwd(), ".data", "cashihan.sqlite"));
    if (!remoteUrl) mkdirSync(dirname(localPath), { recursive: true });
    const client = createClient({
        url: remoteUrl || `file:${localPath}`,
        authToken: remoteToken,
        intMode: "number",
    });
    try {
        await client.executeMultiple(`
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
        return client;
    } catch (error) {
        client.close();
        throw error;
    }
}

export function getDb() {
    database ??= openDb().catch((error) => {
        database = undefined;
        throw error;
    });
    return database;
}

export async function queryRows<T>(db: DbConnection, sql: string, args: DbArgs = []): Promise<T[]> {
    const result = await db.execute({ sql, args });
    return result.rows as unknown as T[];
}

export async function queryOne<T>(db: DbConnection, sql: string, args: DbArgs = []): Promise<T | undefined> {
    return (await queryRows<T>(db, sql, args))[0];
}

export async function withTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    const tx = await (await getDb()).transaction("write");
    try {
        const result = await work(tx);
        await tx.commit();
        return result;
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.close();
    }
}
