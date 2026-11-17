import { getDb, queryOne } from "@/lib/server/db";
import { createSession, sameOrigin, verifyPassword } from "@/lib/server/auth";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await queryOne<{ id: string; name: string; email: string; password_hash: string }>(
        await getDb(), "SELECT id, name, email, password_hash FROM users WHERE email = ?", [email]);
    if (!user || !await verifyPassword(password, user.password_hash)) {
        return Response.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
}
