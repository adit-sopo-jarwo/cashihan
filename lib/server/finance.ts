import { getDb, queryRows, type DbConnection } from "@/lib/server/db";

export type AccountRow = { id: string; name: string; number: string; opening_balance: number };
export type TransactionRow = {
    id: string; type: "income" | "expense" | "transfer"; account_id: string;
    destination_id: string | null; amount: number; title: string | null; note: string; date: string;
};

export async function userAccounts(userId: string, connection?: DbConnection) {
    return queryRows<AccountRow>(connection || await getDb(),
        "SELECT id, name, number, opening_balance FROM accounts WHERE user_id = ? ORDER BY rowid", [userId]);
}

export async function userTransactions(userId: string, connection?: DbConnection) {
    return queryRows<TransactionRow>(connection || await getDb(),
        "SELECT id, type, account_id, destination_id, amount, title, note, date FROM transactions WHERE user_id = ? ORDER BY date DESC, rowid DESC", [userId]);
}

export function balances(accounts: AccountRow[], transactions: TransactionRow[]) {
    const values = new Map(accounts.map((account) => [account.id, account.opening_balance]));
    for (const transaction of transactions) {
        values.set(transaction.account_id, (values.get(transaction.account_id) || 0) + (transaction.type === "income" ? transaction.amount : -transaction.amount));
        if (transaction.type === "transfer" && transaction.destination_id) {
            values.set(transaction.destination_id, (values.get(transaction.destination_id) || 0) + transaction.amount);
        }
    }
    return values;
}

export async function userData(userId: string) {
    const db = await getDb();
    const accounts = await userAccounts(userId, db);
    const transactions = await userTransactions(userId, db);
    const amounts = balances(accounts, transactions);
    const budgets = await queryRows<{ month: string; amount: number }>(db,
        "SELECT month, amount FROM budgets WHERE user_id = ?", [userId]);
    return {
        accounts: accounts.map((account) => ({ id: account.id, name: account.name, number: account.number, balance: amounts.get(account.id) || 0 })),
        transactions: transactions.map((transaction) => ({
            id: transaction.id, type: transaction.type, accountId: transaction.account_id,
            destinationId: transaction.destination_id || undefined, amount: transaction.amount,
            title: transaction.title || undefined, note: transaction.note, date: transaction.date,
        })),
        budgets,
    };
}

export function validMoney(value: unknown, allowZero = false): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0);
}

export function validTransactionInput(value: unknown): value is {
    type: TransactionRow["type"]; accountId: string; destinationId?: string;
    amount: number; title?: string; note?: string; date?: string;
} {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return ["income", "expense", "transfer"].includes(String(item.type)) &&
        typeof item.accountId === "string" && validMoney(item.amount) &&
        (item.destinationId === undefined || typeof item.destinationId === "string") &&
        (item.title === undefined || typeof item.title === "string") &&
        (item.note === undefined || typeof item.note === "string") &&
        (item.date === undefined || (typeof item.date === "string" && !Number.isNaN(Date.parse(item.date))));
}
