"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Account } from "@/components/add-account-dialog";
import { loadData } from "@/lib/client-data";

type Transaction = {
    id: string;
    type: "income" | "expense" | "transfer";
    accountId: string;
    destinationId?: string;
    title?: string;
    amount: number;
    note: string;
    date: string;
};

const money = (value: number) => new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(value);

function monthKey(date: string) {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(key: string) {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${key}-01T00:00:00`));
}

export default function ReportsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        const frame = window.requestAnimationFrame(async () => {
            const now = new Date();
            setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
            try {
                const data = await loadData();
                setAccounts(data.accounts);
                setTransactions(data.transactions);
            } catch {
                setLoadError("Could not load report data. Please refresh the page.");
            }
            setLoaded(true);
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const months = [...new Set([selectedMonth, ...transactions.map((transaction) => monthKey(transaction.date))])].filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)).sort().reverse();
    const visible = transactions.filter((transaction) => selectedMonth === "all" || monthKey(transaction.date) === selectedMonth).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const income = visible.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = visible.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
    const transfers = visible.filter((transaction) => transaction.type === "transfer").reduce((sum, transaction) => sum + transaction.amount, 0);
    const chartMaximum = Math.max(income, expenses, 1);
    const accountName = (id?: string) => accounts.find((account) => account.id === id)?.name || "Unknown account";

    function downloadCsv() {
        const quote = (value: string | number) => {
            const text = String(value);
            const safe = /^[=+@\-\t\r\n]/.test(text) ? `'${text}` : text;
            return `"${safe.replaceAll('"', '""')}"`;
        };
        const rows = [
            ["Date", "Type", "Title", "From account", "To account", "Amount (IDR)", "Description"],
            ...visible.map((transaction) => [
                new Date(transaction.date).toLocaleDateString("id-ID"), transaction.type,
                transaction.title || "", accountName(transaction.accountId),
                transaction.type === "transfer" ? accountName(transaction.destinationId) : "",
                transaction.amount, transaction.note,
            ]),
        ];
        const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `cashihan-report-${selectedMonth}.csv`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-[#0f1726] p-4 font-sans text-white sm:p-6">
            <nav aria-label="Breadcrumb" className="text-sm text-slate-400"><Link href="/dashboard" className="hover:text-[var(--app-text)]">Dashboard</Link><span className="mx-2">/</span><span aria-current="page" className="text-[var(--app-text)]">Reports</span></nav>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <div><h1 className="text-2xl font-semibold">Reports</h1><p className="mt-1 text-sm text-slate-400">Review your income, expenses, and transfers.</p></div>
                <div className="flex flex-wrap items-end gap-3">
                    <div><label htmlFor="report-month" className="block text-xs text-slate-400">Period</label><select id="report-month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} disabled={!loaded} className="mt-1 h-10 rounded-lg border border-[#34445c] bg-[#182131] px-3 text-sm outline-none focus:border-[#1683f3]"><option value="all">All time</option>{months.map((month) => <option key={month} value={month}>{monthName(month)}</option>)}</select></div>
                    <button type="button" onClick={downloadCsv} disabled={!loaded || visible.length === 0} className="flex h-10 items-center gap-2 rounded-lg bg-[#1683f3] px-4 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Export CSV</button>
                </div>
            </div>
            {loadError && <p role="alert" className="mt-4 text-sm text-red-400">{loadError}</p>}

            <section aria-label="Report summary" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Income", value: income, icon: ArrowDown, color: "text-green-400" },
                    { label: "Expenses", value: expenses, icon: ArrowUp, color: "text-red-400" },
                    { label: "Net cash flow", value: income - expenses, icon: ArrowLeftRight, color: "text-blue-300" },
                    { label: "Transfers", value: transfers, icon: ArrowLeftRight, color: "text-slate-300" },
                ].map(({ label, value, icon: Icon, color }) => <Card key={label} className="rounded-2xl bg-[#182131] py-5 text-white ring-1 ring-[#222d3f]"><CardContent className="px-5"><div className="flex items-center justify-between"><h2 className="text-sm text-slate-300">{label}</h2><Icon size={20} className={color} aria-hidden="true" /></div><p className="mt-5 break-words text-xl font-semibold">{money(value)}</p></CardContent></Card>)}
            </section>

            <Card className="mt-5 rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]"><CardContent className="px-6"><h2 className="text-lg font-semibold">Income vs Expenses</h2><p className="mt-1 text-sm text-slate-400">{selectedMonth === "all" ? "All time" : selectedMonth ? monthName(selectedMonth) : "Loading"}</p><div className="mt-6 space-y-5">{[{ label: "Income", value: income, color: "bg-[#1683f3]" }, { label: "Expenses", value: expenses, color: "bg-[#f59e0b]" }].map((item) => <div key={item.label}><div className="flex justify-between gap-3 text-sm"><span>{item.label}</span><span>{money(item.value)}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[#26374e]"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value / chartMaximum * 100}%` }} /></div></div>)}</div></CardContent></Card>

            <Card className="mt-5 rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]"><CardContent className="px-6"><h2 className="text-lg font-semibold">Transactions</h2><p className="mt-1 text-sm text-slate-400">{visible.length} transactions in this report</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-[#34445c] text-slate-400"><tr><th scope="col" className="pb-3 font-medium">Date</th><th scope="col" className="pb-3 font-medium">Type</th><th scope="col" className="pb-3 font-medium">Account</th><th scope="col" className="pb-3 font-medium">Description</th><th scope="col" className="pb-3 text-right font-medium">Amount</th></tr></thead><tbody>{visible.map((transaction) => <tr key={transaction.id} className="border-b border-[#26374e] last:border-0"><td className="py-4 text-slate-300">{new Date(transaction.date).toLocaleDateString("id-ID")}</td><td className="py-4 capitalize">{transaction.type}</td><td className="py-4">{accountName(transaction.accountId)}{transaction.type === "transfer" && <> → {accountName(transaction.destinationId)}</>}</td><td className="py-4 text-slate-300">{transaction.title || transaction.note || "—"}</td><td className="py-4 text-right font-medium">{money(transaction.amount)}</td></tr>)}</tbody></table>{loaded && visible.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No transactions for this period.</p>}</div></CardContent></Card>
        </main>
    );
}
