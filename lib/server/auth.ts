import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb, queryOne } from "@/lib/server/db";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "cashihan-session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
    const [salt, hex] = stored.split(":");
    if (!salt || !hex || hex.length !== 128) return false;
    const expected = Buffer.from(hex, "hex");
    const actual = (await scrypt(password, salt, 64)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
    const token = randomBytes(32).toString("hex");
    await (await getDb()).execute({
        sql: "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        args: [tokenHash(token), userId, Date.now() + SESSION_SECONDS * 1000],
    });
    (await cookies()).set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_SECONDS,
    });
}

export async function getUser() {
    const token = (await cookies()).get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await queryOne<{ id: string; name: string; email: string }>(await getDb(), `
        SELECT users.id, users.name, users.email FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `, [tokenHash(token), Date.now()]) || null;
}

export async function deleteSession() {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (token) await (await getDb()).execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [tokenHash(token)] });
    store.delete(COOKIE_NAME);
}

export function sameOrigin(request: Request) {
    const origin = request.headers.get("origin");
    return !origin || origin === new URL(request.url).origin;
}
