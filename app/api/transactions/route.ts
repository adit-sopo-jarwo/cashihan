import { getUser, sameOrigin } from "@/lib/server/auth";
import { TransactionError, writeTransaction } from "@/lib/server/transactions";

export async function POST(request: Request) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    try {
        return Response.json({ transaction: writeTransaction(user.id, body) }, { status: 201 });
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Could not save transaction." },
            { status: error instanceof TransactionError ? error.status : 500 });
    }
}
