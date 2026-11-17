"use client";

import { useEffect } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

export type ToastNotice = {
    id: number;
    type: "success" | "error";
    message: string;
};

export function Toast({ notice, onDismiss }: { notice: ToastNotice | null; onDismiss: () => void }) {
    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(onDismiss, 4000);
        return () => window.clearTimeout(timer);
    }, [notice, onDismiss]);

    if (!notice) return null;
    const Icon = notice.type === "success" ? CheckCircle2 : CircleAlert;

    return (
        <div role={notice.type === "error" ? "alert" : "status"} data-toast-type={notice.type} className={`fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 text-sm text-white shadow-2xl ${notice.type === "success" ? "border-emerald-500/40 bg-[#123a31]" : "border-red-500/40 bg-[#4a2028]"}`}>
            <Icon size={20} className="shrink-0" aria-hidden="true" />
            <span className="flex-1">{notice.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={onDismiss} className="rounded p-0.5 hover:bg-white/10"><X size={16} /></button>
        </div>
    );
}
