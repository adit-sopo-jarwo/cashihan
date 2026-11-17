import { getDb } from "@/lib/server/db";

export type AccountRow = { id: string; name: string; number: string; opening_balance: number };
export type TransactionRow = {
    id: string; type: "income" | "expense" | "transfer"; account_id: string;
    destination_id: string | null; amount: number; title: string | null; note: string; date: string;
};

export function userAccounts(userId: string) {
    return getDb().prepare("SELECT id, name, number, opening_balance FROM accounts WHERE user_id = ? ORDER BY rowid")
        .all(userId) as AccountRow[];
}

export function userTransactions(userId: string) {
    return getDb().prepare("SELECT id, type, account_id, destination_id, amount, title, note, date FROM transactions WHERE user_id = ? ORDER BY date DESC, rowid DESC")
        .all(userId) as TransactionRow[];
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

export function userData(userId: string) {
    const accounts = userAccounts(userId);
    const transactions = userTransactions(userId);
    const amounts = balances(accounts, transactions);
    const budgets = getDb().prepare("SELECT month, amount FROM budgets WHERE user_id = ?").all(userId) as { month: string; amount: number }[];
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
