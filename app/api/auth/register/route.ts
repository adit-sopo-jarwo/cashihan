import { randomUUID } from "node:crypto";
import { getDb, queryOne } from "@/lib/server/db";
import { createSession, hashPassword, sameOrigin } from "@/lib/server/auth";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
        return Response.json({ error: "Enter a valid name, email, and password of at least 8 characters." }, { status: 400 });
    }
    const db = await getDb();
    if (await queryOne(db, "SELECT id FROM users WHERE email = ?", [email])) {
        return Response.json({ error: "Email is already registered." }, { status: 409 });
    }
    const id = randomUUID();
    try {
        await db.execute({
            sql: "INSERT INTO users(id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [id, name, email, await hashPassword(password), new Date().toISOString()],
        });
    } catch {
        return Response.json({ error: "Could not create account." }, { status: 500 });
    }
    await createSession(id);
    return Response.json({ user: { id, name, email } }, { status: 201 });
}
