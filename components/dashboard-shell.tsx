"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, ChartNoAxesCombined, LayoutDashboard, Menu, Moon, Sun, UserRound, X } from "lucide-react";

const menu = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Income", href: "/dashboard/income", icon: ArrowDown },
    { label: "Expenses", href: "/dashboard/expense", icon: ArrowUp },
    { label: "Transfers", href: "/dashboard/transfer", icon: ArrowLeftRight },
    { label: "Reports", href: "/dashboard/reports", icon: ChartNoAxesCombined },
];

export function DashboardShell({ children, user }: { children: ReactNode; user: { name: string; email: string } }) {
    const pathname = usePathname();
    const router = useRouter();
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [profileOpen, setProfileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            if (window.localStorage.getItem("cashihan-theme") === "light") setTheme("light");
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        document.documentElement.dataset.cashihanTheme = theme;
        return () => { delete document.documentElement.dataset.cashihanTheme; };
    }, [theme]);

    function toggleTheme() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        window.localStorage.setItem("cashihan-theme", next);
    }

    async function signOut() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
    }

    return (
        <div className="app-shell flex min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]" data-theme={theme}>
            {menuOpen && <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
            <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-[var(--app-border)] bg-[var(--app-panel)] p-5 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="flex items-center justify-between">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-xl font-bold tracking-tight">Cashihan</Link>
                    <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close sidebar" className="rounded-md p-1 hover:bg-[var(--app-hover)] md:hidden"><X size={20} /></button>
                </div>
                <nav aria-label="Sidebar" className="mt-9 space-y-1">
                    {menu.map(({ label, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={pathname === href ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === href ? "bg-[#1683f3] text-white" : "text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"}`}><Icon size={19} />{label}</Link>)}
                </nav>
            </aside>
            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)] px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-[var(--app-hover)] md:hidden"><Menu size={20} /></button>
                        <span className="text-sm font-semibold">{menu.find((item) => item.href === pathname)?.label || "Dashboard"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} className="rounded-lg p-2 hover:bg-[var(--app-hover)]">{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}</button>
                        <div className="relative">
                            <button type="button" aria-label="Profile" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--app-hover)]"><span className="rounded-full bg-[#1683f3] p-1.5 text-white"><UserRound size={17} /></span><span className="hidden text-sm sm:inline">Profile</span></button>
                            {profileOpen && <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-sm shadow-xl"><p className="truncate font-medium">{user.name}</p><p className="mt-1 truncate text-xs text-[var(--app-muted)]">{user.email}</p><button type="button" onClick={signOut} className="mt-3 w-full rounded-lg bg-[var(--app-hover)] px-3 py-2 text-left font-medium hover:opacity-80">Sign out</button></div>}
                        </div>
                    </div>
                </header>
                <div className="min-w-0">{children}</div>
            </div>
        </div>
    );
}
