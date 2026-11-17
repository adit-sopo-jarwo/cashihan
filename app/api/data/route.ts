import { getUser } from "@/lib/server/auth";
import { userData } from "@/lib/server/finance";

export async function GET() {
    const user = await getUser();
    return user ? Response.json(userData(user.id), { headers: { "Cache-Control": "no-store" } })
        : Response.json({ error: "Unauthorized." }, { status: 401 });
}
