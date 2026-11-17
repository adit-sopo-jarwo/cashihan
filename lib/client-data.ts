export type Account = { id: string; name: string; number: string; balance: number };
export type Transaction = {
    id: string; type: "income" | "expense" | "transfer"; accountId: string;
    destinationId?: string; amount: number; title?: string; note: string; date: string;
};
export type AppData = { accounts: Account[]; transactions: Transaction[]; budgets: { month: string; amount: number }[] };

export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    let result: T | { error?: string };
    try {
        if (!contentType.includes("application/json")) throw new Error("Non-JSON response");
        result = await response.json();
    } catch {
        throw new Error(`Server returned an invalid response (HTTP ${response.status}). Check the deployment and database connection.`);
    }
    if (!response.ok) throw new Error((result as { error?: string }).error || `Request failed (HTTP ${response.status}).`);
    return result as T;
}

export async function loadData(): Promise<AppData> {
    let data = await api<AppData>("/api/data");
    const raw = window.localStorage.getItem("cashihan-accounts");
    const legacyBalance = Number(window.localStorage.getItem("cashihan-balance"));
    if ((!raw && !(Number.isSafeInteger(legacyBalance) && legacyBalance > 0)) || data.accounts.length > 0) return data;
    try {
        const accounts = raw ? JSON.parse(raw) : [{ id: crypto.randomUUID(), name: "M-Banking", number: "", balance: legacyBalance }];
        const transactions = JSON.parse(window.localStorage.getItem("cashihan-transactions") || "[]");
        const budgets = Object.keys(window.localStorage)
            .filter((key) => key.startsWith("cashihan-budget-"))
            .map((key) => ({ month: key.slice("cashihan-budget-".length), amount: Number(window.localStorage.getItem(key)) }));
        if (!Array.isArray(accounts) || accounts.length === 0) return data;
        const result = await api<{ imported: boolean }>("/api/import", "POST", { accounts, transactions, budgets });
        if (result.imported) {
            data = await api<AppData>("/api/data");
            window.localStorage.removeItem("cashihan-accounts");
            window.localStorage.removeItem("cashihan-balance");
            window.localStorage.removeItem("cashihan-transactions");
            for (const key of Object.keys(window.localStorage)) {
                if (key.startsWith("cashihan-budget-")) window.localStorage.removeItem(key);
            }
        }
    } catch {
        // Keep local data untouched if import fails so it can be retried.
    }
    return data;
}
