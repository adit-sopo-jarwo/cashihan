import { DashboardShell } from "@/components/dashboard-shell";
import { getUser } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    await connection();
    const user = await getUser();
    if (!user) redirect("/login");
    return <DashboardShell user={user}>{children}</DashboardShell>;
}
