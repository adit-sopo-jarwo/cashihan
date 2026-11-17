import { deleteSession, sameOrigin } from "@/lib/server/auth";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    await deleteSession();
    return Response.json({ ok: true });
}
