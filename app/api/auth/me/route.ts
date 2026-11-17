import { getUser } from "@/lib/server/auth";

export async function GET() {
    const user = await getUser();
    return user ? Response.json({ user }) : Response.json({ error: "Unauthorized." }, { status: 401 });
}
