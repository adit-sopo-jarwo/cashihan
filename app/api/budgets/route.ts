import { getUser, sameOrigin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { validMoney } from "@/lib/server/finance";

export async function PUT(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    if (typeof body.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) || !validMoney(body.amount, true)) {
        return Response.json({ error: "Invalid budget." }, { status: 400 });
    }
    getDb().prepare("INSERT INTO budgets(user_id, month, amount) VALUES (?, ?, ?) ON CONFLICT(user_id, month) DO UPDATE SET amount = excluded.amount")
        .run(user.id, body.month, body.amount);
    return Response.json({ month: body.month, amount: body.amount });
}
