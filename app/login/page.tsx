"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, Wallet } from "lucide-react";
import { api } from "@/lib/client-data";

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
            await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", "POST", {
                name: data.get("name"), email: data.get("email"), password: data.get("password"),
            });
            router.replace("/dashboard");
            router.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not sign in.");
        } finally {
            setBusy(false);
        }
    }

    const inputClass = "h-11 w-full rounded-lg border border-[#34445c] bg-[#101a2a] pr-3 pl-10 outline-none placeholder:text-slate-500 focus:border-[#1683f3]";

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0f1726] px-4 py-10 font-sans text-white">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight"><span className="rounded-xl bg-[#1683f3] p-2.5"><Wallet size={24} aria-hidden="true" /></span>Cashihan</div>
                    <h1 className="mt-8 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                    <p className="mt-2 text-sm text-slate-400">Your finances, saved to your account.</p>
                </div>
                <div className="rounded-2xl border border-[#2b3950] bg-[#182131] p-6 shadow-xl sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === "register" && <div><label htmlFor="name" className="block text-sm font-medium">Name</label><div className="relative mt-2"><UserRound size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your name" className={inputClass} /></div></div>}
                        <div><label htmlFor="email" className="block text-sm font-medium">Email address</label><div className="relative mt-2"><Mail size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={inputClass} /></div></div>
                        <div><label htmlFor="password" className="block text-sm font-medium">Password</label><div className="relative mt-2"><LockKeyhole size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} placeholder="Enter your password" className={`${inputClass} pr-11`} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{mode === "register" && <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>}</div>
                        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
                        <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1683f3] text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={17} aria-hidden="true" /></button>
                    </form>
                    <div className="mt-6 border-t border-[#34445c] pt-6 text-center text-sm text-slate-400">
                        {mode === "login" ? "New to Cashihan?" : "Already have an account?"}{" "}
                        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-medium text-blue-300 hover:text-blue-200">{mode === "login" ? "Create account" : "Sign in"}</button>
                    </div>
                </div>
            </div>
        </main>
    );
}
