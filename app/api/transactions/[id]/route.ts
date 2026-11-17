import { getUser, sameOrigin } from "@/lib/server/auth";
import { TransactionError, removeTransaction, writeTransaction } from "@/lib/server/transactions";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
    try {
        return Response.json({ transaction: await writeTransaction(user.id, body, (await context.params).id) });
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Could not update transaction." },
            { status: error instanceof TransactionError ? error.status : 500 });
    }
}

export async function DELETE(request: Request, context: Context) {
    if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
    const user = await getUser();
    if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
    try {
        await removeTransaction(user.id, (await context.params).id);
        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Could not delete transaction." },
            { status: error instanceof TransactionError ? error.status : 500 });
    }
}
