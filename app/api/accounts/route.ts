import { randomUUID } from "node:crypto";
import { getUser, sameOrigin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { validMoney } from "@/lib/server/finance";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const number = typeof body.number === "string" ? body.number.trim() : "";
    if (!name || name.length > 80 || number.length > 40 || !validMoney(body.balance, true)) {
        return Response.json({ error: "Invalid account details." }, { status: 400 });
    }
    const account = { id: randomUUID(), name, number, balance: body.balance };
    await (await getDb()).execute({
        sql: "INSERT INTO accounts(id, user_id, name, number, opening_balance) VALUES (?, ?, ?, ?, ?)",
        args: [account.id, user.id, name, number, account.balance],
    });
    return Response.json({ account }, { status: 201 });
}
