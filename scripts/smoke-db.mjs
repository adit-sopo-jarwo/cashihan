import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";

const base = process.env.CASHIHAN_TEST_URL || "http://localhost:3217";
const suffix = randomUUID();
const emails = [`smoke-${suffix}-a@example.com`, `smoke-${suffix}-b@example.com`, `smoke-${suffix}-c@example.com`];

async function request(path, method = "GET", body, cookie) {
    const response = await fetch(`${base}${path}`, {
        method,
        headers: {
            Origin: base,
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
    });
    const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
    return { response, data };
}

function check(condition, message) {
    if (!condition) throw new Error(message);
}

try {
    const anonymous = await request("/api/data");
    check(anonymous.response.status === 401, "Anonymous data access should fail");
    const protectedPage = await request("/dashboard");
    const protectedHtml = await fetch(`${base}/dashboard`).then((response) => response.text());
    check((protectedPage.response.status === 307 && protectedPage.response.headers.get("location")?.endsWith("/login")) || protectedHtml.includes("NEXT_REDIRECT"), "Dashboard should require login");

    const first = await request("/api/auth/register", "POST", { name: "Test One", email: emails[0], password: "TestPassword123" });
    check(first.response.status === 201, `Registration failed: ${JSON.stringify(first.data)}`);
    const cookie = first.response.headers.get("set-cookie")?.split(";")[0];
    check(cookie, "Session cookie missing");
    const dashboardResponse = await fetch(`${base}/dashboard`, { headers: { Cookie: cookie } });
    const dashboardHtml = await dashboardResponse.text();
    check(dashboardResponse.ok && !dashboardHtml.includes('id="__next_error__"') && dashboardHtml.includes("Test One"), "Authenticated dashboard should render without error");

    const accountResponse = await request("/api/accounts", "POST", { name: "Bank", number: "123", balance: 100000 }, cookie);
    check(accountResponse.response.status === 201, `Account creation failed: ${JSON.stringify(accountResponse.data)}`);
    const accountId = accountResponse.data.account.id;

    const income = await request("/api/transactions", "POST", { type: "income", accountId, title: "Salary", amount: 50000, note: "" }, cookie);
    check(income.response.status === 201, `Income failed: ${JSON.stringify(income.data)}`);
    const expense = await request("/api/transactions", "POST", { type: "expense", accountId, amount: 25000, note: "Lunch" }, cookie);
    check(expense.response.status === 201, `Expense failed: ${JSON.stringify(expense.data)}`);
    const overspend = await request("/api/transactions", "POST", { type: "expense", accountId, amount: 200000, note: "Too much" }, cookie);
    check(overspend.response.status === 400, "Overspending should fail");

    const budget = await request("/api/budgets", "PUT", { month: "2026-11", amount: 75000 }, cookie);
    check(budget.response.ok, "Budget save failed");
    const data = await request("/api/data", "GET", undefined, cookie);
    check(data.data.accounts[0].balance === 125000 && data.data.transactions.length === 2 && data.data.budgets[0].amount === 75000, "Saved data is incorrect");

    const second = await request("/api/auth/register", "POST", { name: "Test Two", email: emails[1], password: "TestPassword123" });
    check(second.response.status === 201, "Second registration failed");
    const secondCookie = second.response.headers.get("set-cookie")?.split(";")[0];
    const otherData = await request("/api/data", "GET", undefined, secondCookie);
    check(otherData.data.accounts.length === 0 && otherData.data.transactions.length === 0, "User data is not isolated");
    const crossUserDelete = await request(`/api/transactions/${expense.data.transaction.id}`, "DELETE", undefined, secondCookie);
    check(crossUserDelete.response.status === 404, "Cross-user delete should fail");

    const updated = await request(`/api/transactions/${expense.data.transaction.id}`, "PUT", { type: "expense", accountId, amount: 30000, note: "Updated lunch" }, cookie);
    check(updated.response.ok, "Transaction update failed");
    const afterUpdate = await request("/api/data", "GET", undefined, cookie);
    check(afterUpdate.data.accounts[0].balance === 120000, "Updated balance is incorrect");
    const deleted = await request(`/api/transactions/${expense.data.transaction.id}`, "DELETE", undefined, cookie);
    check(deleted.response.ok, "Transaction delete failed");
    const afterDelete = await request("/api/data", "GET", undefined, cookie);
    check(afterDelete.data.accounts[0].balance === 150000, "Deleted balance is incorrect");

    const third = await request("/api/auth/register", "POST", { name: "Test Three", email: emails[2], password: "TestPassword123" });
    check(third.response.status === 201, "Third registration failed");
    const thirdCookie = third.response.headers.get("set-cookie")?.split(";")[0];
    const oldAccountId = randomUUID();
    const imported = await request("/api/import", "POST", {
        accounts: [{ id: oldAccountId, name: "Old bank", number: "", balance: 125000 }],
        transactions: [{ id: randomUUID(), type: "income", accountId: oldAccountId, amount: 25000, title: "Old income", note: "", date: "2026-11-01T00:00:00.000Z" }],
        budgets: [{ month: "2026-11", amount: 50000 }],
    }, thirdCookie);
    check(imported.response.ok && imported.data.imported, `Import failed: ${JSON.stringify(imported.data)}`);
    const importedData = await request("/api/data", "GET", undefined, thirdCookie);
    check(importedData.data.accounts[0].balance === 125000 && importedData.data.transactions.length === 1, "Imported data is incorrect");

    const logout = await request("/api/auth/logout", "POST", undefined, cookie);
    check(logout.response.ok, "Logout failed");
    const expired = await request("/api/data", "GET", undefined, cookie);
    check(expired.response.status === 401, "Logged-out session should be invalid");
    const wrongPassword = await request("/api/auth/login", "POST", { email: emails[0], password: "wrong-password" });
    check(wrongPassword.response.status === 401, "Wrong password should fail");
    const login = await request("/api/auth/login", "POST", { email: emails[0], password: "TestPassword123" });
    check(login.response.ok, "Login failed");

    console.log("Database smoke test passed");
} finally {
    if (existsSync(".data/cashihan.sqlite")) {
        const db = createClient({ url: "file:.data/cashihan.sqlite" });
        await db.execute({ sql: "DELETE FROM users WHERE email IN (?, ?, ?)", args: emails });
        db.close();
    }
}
