import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/server/db";
import { balances, userAccounts, userTransactions, validTransactionInput, type TransactionRow } from "@/lib/server/finance";

export class TransactionError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}

export async function writeTransaction(userId: string, value: unknown, editingId?: string) {
    if (!validTransactionInput(value)) throw new TransactionError("Invalid transaction details.");
    const input = value;
    if (input.type === "income" && (!input.title?.trim() || input.title.length > 100)) {
        throw new TransactionError("Enter a title for this income.");
    }
    if ((input.note?.length || 0) > 160 || (input.type === "transfer" && (!input.destinationId || input.destinationId === input.accountId))) {
        throw new TransactionError("Invalid transaction details.");
    }
    return withTransaction(async (db) => {
        const accounts = await userAccounts(userId, db);
        if (!accounts.some((account) => account.id === input.accountId) ||
            (input.type === "transfer" && !accounts.some((account) => account.id === input.destinationId))) {
            throw new TransactionError("Choose a valid account.");
        }
        const existing = await userTransactions(userId, db);
        const old = editingId ? existing.find((transaction) => transaction.id === editingId) : undefined;
        if (editingId && !old) throw new TransactionError("Transaction not found.", 404);
        const transaction: TransactionRow = {
            id: editingId || randomUUID(), type: input.type, account_id: input.accountId,
            destination_id: input.type === "transfer" ? input.destinationId || null : null,
            amount: input.amount, title: input.type === "income" ? input.title!.trim() : null,
            note: input.note?.trim() || "", date: old?.date || new Date().toISOString(),
        };
        const next = editingId ? existing.map((item) => item.id === editingId ? transaction : item) : [transaction, ...existing];
        if ([...balances(accounts, next).values()].some((amount) => amount < 0 || !Number.isSafeInteger(amount))) {
            throw new TransactionError("Insufficient balance in an account.");
        }
        if (editingId) {
            await db.execute({
                sql: "UPDATE transactions SET type = ?, account_id = ?, destination_id = ?, amount = ?, title = ?, note = ? WHERE id = ? AND user_id = ?",
                args: [transaction.type, transaction.account_id, transaction.destination_id, transaction.amount, transaction.title, transaction.note, editingId, userId],
            });
        } else {
            await db.execute({
                sql: "INSERT INTO transactions(id, user_id, type, account_id, destination_id, amount, title, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                args: [transaction.id, userId, transaction.type, transaction.account_id, transaction.destination_id, transaction.amount, transaction.title, transaction.note, transaction.date],
            });
        }
        return { id: transaction.id, type: transaction.type, accountId: transaction.account_id,
            destinationId: transaction.destination_id || undefined, amount: transaction.amount,
            title: transaction.title || undefined, note: transaction.note, date: transaction.date };
    });
}

export async function removeTransaction(userId: string, id: string) {
    return withTransaction(async (db) => {
        const existing = await userTransactions(userId, db);
        if (!existing.some((transaction) => transaction.id === id)) throw new TransactionError("Transaction not found.", 404);
        const next = existing.filter((transaction) => transaction.id !== id);
        if ([...balances(await userAccounts(userId, db), next).values()].some((amount) => amount < 0)) {
            throw new TransactionError("Cannot delete because an account would have a negative balance.");
        }
        await db.execute({ sql: "DELETE FROM transactions WHERE id = ? AND user_id = ?", args: [id, userId] });
    });
}
