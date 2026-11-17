import { getUser, sameOrigin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { balances, userAccounts, validMoney, type AccountRow, type TransactionRow } from "@/lib/server/finance";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const rawAccounts = body.accounts;
    const rawTransactions = body.transactions;
    const rawBudgets = body.budgets;
    if (!Array.isArray(rawAccounts) || !Array.isArray(rawTransactions) || !Array.isArray(rawBudgets) || rawAccounts.length > 100 || rawTransactions.length > 5000 || rawBudgets.length > 120) {
        return Response.json({ error: "Invalid import data." }, { status: 400 });
    }
    const accounts = rawAccounts.filter((item): item is { id: string; name: string; number: string; balance: number } =>
        item && typeof item.id === "string" && item.id.length <= 100 &&
        typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 80 &&
        typeof item.number === "string" && item.number.length <= 40 && validMoney(item.balance, true));
    if (accounts.length !== rawAccounts.length || new Set(accounts.map((item) => item.id)).size !== accounts.length) {
        return Response.json({ error: "Invalid accounts." }, { status: 400 });
    }
    const accountIds = new Set(accounts.map((item) => item.id));
    const transactions = rawTransactions.filter((item): item is { id: string; type: TransactionRow["type"]; accountId: string; destinationId?: string; amount: number; title?: string; note: string; date: string } =>
        item && typeof item.id === "string" && item.id.length <= 100 &&
        ["income", "expense", "transfer"].includes(item.type) && accountIds.has(item.accountId) &&
        (item.type !== "transfer" || (typeof item.destinationId === "string" && item.destinationId !== item.accountId && accountIds.has(item.destinationId))) &&
        validMoney(item.amount) && typeof item.note === "string" && item.note.length <= 160 &&
        (item.title === undefined || (typeof item.title === "string" && item.title.length <= 100)) &&
        typeof item.date === "string" && !Number.isNaN(Date.parse(item.date)));
    if (transactions.length !== rawTransactions.length || new Set(transactions.map((item) => item.id)).size !== transactions.length) {
        return Response.json({ error: "Invalid transactions." }, { status: 400 });
    }
    const rows: TransactionRow[] = transactions.map((item) => ({
        id: item.id, type: item.type, account_id: item.accountId, destination_id: item.type === "transfer" ? item.destinationId || null : null,
        amount: item.amount, title: item.title || null, note: item.note, date: item.date,
    }));
    const delta = balances(accounts.map((item): AccountRow => ({ id: item.id, name: item.name, number: item.number, opening_balance: 0 })), rows);
    const opening = accounts.map((item) => ({ ...item, openingBalance: item.balance - (delta.get(item.id) || 0) }));
    if (opening.some((item) => !validMoney(item.openingBalance, true))) {
        return Response.json({ error: "Account balances do not match transactions." }, { status: 400 });
    }
    const budgets = rawBudgets.filter((item): item is { month: string; amount: number } =>
        item && typeof item.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) && validMoney(item.amount, true));
    if (budgets.length !== rawBudgets.length) return Response.json({ error: "Invalid budgets." }, { status: 400 });
    const db = getDb();
    try {
        const imported = db.transaction(() => {
            if (userAccounts(user.id).length > 0) return false;
            const insertAccount = db.prepare("INSERT INTO accounts(id, user_id, name, number, opening_balance) VALUES (?, ?, ?, ?, ?)");
            const insertTransaction = db.prepare("INSERT INTO transactions(id, user_id, type, account_id, destination_id, amount, title, note, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            const insertBudget = db.prepare("INSERT INTO budgets(user_id, month, amount) VALUES (?, ?, ?) ON CONFLICT(user_id, month) DO UPDATE SET amount = excluded.amount");
            for (const account of opening) insertAccount.run(account.id, user.id, account.name, account.number, account.openingBalance);
            for (const item of rows) insertTransaction.run(item.id, user.id, item.type, item.account_id, item.destination_id, item.amount, item.title, item.note, item.date);
            for (const budget of budgets) insertBudget.run(user.id, budget.month, budget.amount);
            return true;
        })();
        return Response.json({ imported });
    } catch {
        return Response.json({ error: "Could not import local data." }, { status: 400 });
    }
}
