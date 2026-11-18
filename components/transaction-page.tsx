"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Camera, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AddAccountDialog, type Account } from "@/components/add-account-dialog";
import { parseReceipt } from "@/lib/receipt-ocr";
import { Toast, type ToastNotice } from "@/components/ui/toast";
import { RupiahInput } from "@/components/rupiah-input";
import { api, loadData } from "@/lib/client-data";

type TransactionType = "income" | "expense" | "transfer";
type Transaction = {
    id: string;
    type: TransactionType;
    title?: string;
    accountId: string;
    destinationId?: string;
    amount: number;
    note: string;
    date: string;
};

const details = {
    income: { title: "Income", icon: ArrowDown },
    expense: { title: "Expenses", icon: ArrowUp },
    transfer: { title: "Transfers", icon: ArrowLeftRight },
};
const inputClass = "mt-2 h-11 w-full rounded-lg border border-[#34445c] bg-[#101a2a] px-3 text-white outline-none placeholder:text-slate-500 focus:border-[#1683f3]";
const money = (amount: number) => `IDR ${amount.toLocaleString("id-ID")}`;

function applyTransaction(accounts: Account[], transaction: Transaction, direction: 1 | -1) {
    return accounts.map((account) => {
        let change = 0;
        if (account.id === transaction.accountId) {
            change = transaction.amount * (transaction.type === "income" ? 1 : -1) * direction;
        } else if (transaction.type === "transfer" && account.id === transaction.destinationId) {
            change = transaction.amount * direction;
        }
        return { ...account, balance: account.balance + change };
    });
}

export function TransactionPage({ type }: { type: TransactionType }) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [accountId, setAccountId] = useState("");
    const [destinationId, setDestinationId] = useState("");
    const [amount, setAmount] = useState("");
    const [titleValue, setTitleValue] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [notice, setNotice] = useState<ToastNotice | null>(null);
    const dismissNotice = useCallback(() => setNotice(null), []);
    const [scanning, setScanning] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [scanAccountId, setScanAccountId] = useState("");
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    function showError(message: string) {
        setError(message);
        setNotice({ id: Date.now(), type: "error", message });
    }

    function showSuccess(message: string) {
        setMessage(message);
        setNotice({ id: Date.now(), type: "success", message });
    }

    useEffect(() => {
        const frame = window.requestAnimationFrame(async () => {
            try {
                const data = await loadData();
                setAccounts(data.accounts);
                setTransactions(data.transactions);
                setAccountId(data.accounts[0]?.id || "");
                setScanAccountId(data.accounts[0]?.id || "");
                setDestinationId(data.accounts[1]?.id || "");
            } catch {
                showError("Could not load your transactions. Please refresh the page.");
            }
            setLoaded(true);
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    function resetForm() {
        setScanFeedback(null);
        setEditingId(null);
        setFormOpen(false);
        setAccountId(accounts[0]?.id || "");
        setDestinationId(accounts[1]?.id || "");
        setAmount("");
        setTitleValue("");
        setNote("");
        setError("");
    }

    async function refreshData() {
        const data = await loadData();
        setAccounts(data.accounts);
        setTransactions(data.transactions);
    }

    async function saveTransaction(transaction: Transaction, editingId?: string) {
        try {
            await api(editingId ? `/api/transactions/${editingId}` : "/api/transactions", editingId ? "PUT" : "POST", transaction);
            await refreshData();
            return true;
        } catch (cause) {
            showError(cause instanceof Error ? cause.message : "Could not save transaction.");
            return false;
        }
    }

    async function addAccount(account: Account) {
        const result = await api<{ account: Account }>("/api/accounts", "POST", account);
        setAccounts((current) => [...current, result.account]);
        setAccountId(result.account.id);
        setScanAccountId(result.account.id);
        setError("");
        setMessage("Account added. Review and save the scanned transaction.");
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");
        const value = Number(amount);
        const old = transactions.find((transaction) => transaction.id === editingId);
        if (!accounts.some((account) => account.id === accountId) || !Number.isSafeInteger(value) || value <= 0) {
            showError("Choose an account and enter a valid amount.");
            return;
        }
        if (type === "transfer" && (destinationId === accountId || !accounts.some((account) => account.id === destinationId))) {
            showError("Choose a different destination account.");
            return;
        }
        if (type === "income" && !titleValue.trim()) {
            showError("Enter a title for this income.");
            return;
        }
        const transaction: Transaction = {
            id: old?.id || crypto.randomUUID(), type, accountId,
            title: type === "income" ? titleValue.trim() : undefined,
            destinationId: type === "transfer" ? destinationId : undefined,
            amount: value, note: note.trim(), date: old?.date || new Date().toISOString(),
        };
        const reverted = old ? applyTransaction(accounts, old, -1) : accounts;
        const nextAccounts = applyTransaction(reverted, transaction, 1);
        if (nextAccounts.some((account) => account.balance < 0)) {
            showError("This change would leave an account with insufficient balance.");
            return;
        }
        if (await saveTransaction(transaction, old?.id)) {
            resetForm();
            showSuccess(old ? "Transaction updated." : "Transaction added.");
        }
    }

    async function scanImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setError("");
        setMessage("");
        setScanFeedback(null);
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
            setScanFeedback({ type: "error", message: "Gagal memulai scan. Pilih gambar berukuran kurang dari 10 MB." });
            showError("Choose an image smaller than 10 MB.");
            return;
        }
        const source = accounts.find((account) => account.id === scanAccountId);
        setScanning(true);
        try {
            const { createWorker } = await import("tesseract.js");
            const worker = await createWorker("eng");
            let text = "";
            try {
                const result = await worker.recognize(file);
                text = result.data.text;
            } finally {
                await worker.terminate();
            }
            const receipt = parseReceipt(text);
            setFormOpen(true);
            setEditingId(null);
            setAccountId(source?.id || "");
            setAmount(receipt.amount ? String(receipt.amount) : "");
            setTitleValue(receipt.title);
            setNote(type === "income" ? file.name : receipt.title);
            if (!source) {
                setScanFeedback({ type: "error", message: "Struk sudah dipindai. Tambahkan akun, periksa hasilnya, lalu simpan transaksi." });
                showError("Add an account, then review and save the scanned transaction.");
                return;
            }
            if (!receipt.amount) {
                setScanFeedback({ type: "error", message: "Scan selesai, tetapi total belanja belum terbaca. Isi nominal di formulir, lalu simpan." });
                showError("Total amount was not clear in the image. Enter it manually and save.");
                return;
            }
            if (type === "expense" && source.balance < receipt.amount) {
                setScanFeedback({ type: "error", message: `Nominal ${money(receipt.amount)} terbaca, tetapi melebihi saldo akun. Periksa sebelum menyimpan.` });
                showError("The scanned amount exceeds this account's balance. Review before saving.");
                return;
            }
            setScanFeedback({ type: "success", message: `Struk berhasil dibaca: ${money(receipt.amount)}. Periksa formulir di bawah, lalu tekan Save Transaction.` });
        } catch {
            setScanFeedback({ type: "error", message: "Gagal membaca gambar. Coba foto yang lebih terang dan jelas, atau isi transaksi secara manual." });
            showError("Could not scan this image. Check your connection or enter the transaction manually.");
        } finally {
            setScanning(false);
        }
    }

    function edit(transaction: Transaction) {
        setEditingId(transaction.id);
        setAccountId(transaction.accountId);
        setDestinationId(transaction.destinationId || "");
        setAmount(String(transaction.amount));
        setTitleValue(transaction.title || transaction.note || "Income");
        setNote(transaction.note);
        setError("");
        setMessage("");
        setFormOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function remove(transaction: Transaction) {
        if (!window.confirm("Delete this transaction? Its balance change will be reversed.")) return;
        const nextAccounts = applyTransaction(accounts, transaction, -1);
        if (nextAccounts.some((account) => account.balance < 0)) {
            showError("Cannot delete this transaction because an account would have a negative balance.");
            return;
        }
        try {
            await api(`/api/transactions/${transaction.id}`, "DELETE");
            await refreshData();
            if (editingId === transaction.id) resetForm();
            showSuccess("Transaction deleted.");
            setError("");
        } catch (cause) {
            showError(cause instanceof Error ? cause.message : "Could not delete transaction.");
        }
    }

    const { title, icon: Icon } = details[type];
    const canCreate = accounts.length >= (type === "transfer" ? 2 : 1);
    const accountName = (id?: string) => accounts.find((account) => account.id === id)?.name || "Unknown account";
    const visible = transactions.filter((transaction) => transaction.type === type &&
        `${transaction.title || ""} ${transaction.note} ${accountName(transaction.accountId)} ${accountName(transaction.destinationId)} ${transaction.amount}`.toLowerCase().includes(search.toLowerCase()));

    return (
        <main className="min-h-screen bg-[#0f1726] px-4 py-6 font-sans text-white">
            <div className="w-full">
                <nav aria-label="Breadcrumb" className="mt-6 text-sm text-slate-400">
                    <ol className="flex items-center gap-2"><li><Link href="/dashboard" className="hover:text-[var(--app-text)]">Dashboard</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="text-[var(--app-text)]">{title}</li></ol>
                </nav>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><span className="rounded-xl bg-[#1e2b3d] p-3"><Icon size={24} /></span><div><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm text-slate-400">Manage your {title.toLowerCase()} transactions</p></div></div>
                    <div className="flex flex-wrap gap-2">
                        {type !== "transfer" && <>
                            <button type="button" disabled={!loaded || scanning} onClick={() => uploadInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#34445c] px-4 py-2.5 text-sm font-medium hover:bg-[#26374e] disabled:cursor-not-allowed disabled:opacity-50"><Camera size={17} />{scanning ? "Scanning..." : "Upload image"}</button>
                            <button type="button" disabled={!loaded || scanning} onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[#34445c] px-4 py-2.5 text-sm font-medium hover:bg-[#26374e] disabled:cursor-not-allowed disabled:opacity-50"><Camera size={17} />Scan camera</button>
                        </>}
                        <button type="button" disabled={!loaded || !canCreate} onClick={() => { resetForm(); setFormOpen(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-lg bg-[#1683f3] px-4 py-2.5 text-sm font-medium hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={17} />Add {type === "expense" ? "Expense" : type === "transfer" ? "Transfer" : "Income"}</button>
                    </div>
                </div>
                {type !== "transfer" && loaded && <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#34445c] bg-[#182131] p-4 text-sm">
                    {accounts.length > 0 && <label htmlFor="scan-account" className="font-medium">Record scan to</label>}
                    {accounts.length > 0 ? <select id="scan-account" value={scanAccountId} onChange={(event) => setScanAccountId(event.target.value)} disabled={scanning} className="h-9 rounded-lg border border-[#34445c] bg-[#101a2a] px-3 outline-none focus:border-[#1683f3]">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select> : <AddAccountDialog onAdd={addAccount} />}
                    <span className="text-xs text-slate-400">{accounts.length > 0 ? "Choose a photo or use your camera. The image is processed locally." : "You can scan now, then add an account to save the transaction."}</span>
                    <input ref={uploadInputRef} type="file" accept="image/*" onChange={scanImage} aria-label="Upload receipt image" className="sr-only" />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={scanImage} aria-label="Capture receipt image" className="sr-only" />
                </div>}
                {type !== "transfer" && (scanning || scanFeedback) && <p role={scanFeedback?.type === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 rounded-lg border px-4 py-3 text-sm ${scanFeedback?.type === "error" ? "border-red-500/40 bg-red-950/40 text-red-200" : "border-emerald-500/40 bg-emerald-950/40 text-emerald-100"}`}>{scanning ? "Sedang membaca struk, tunggu sebentar..." : scanFeedback?.message}</p>}
                {!loaded ? <p className="mt-6 text-slate-400">Loading transactions...</p> : !canCreate && <p className="mt-6 rounded-xl border border-[#34445c] bg-[#182131] p-4 text-sm text-slate-300">{type === "transfer" ? "Add at least two accounts" : "Add an account"} to save transactions.</p>}
                {error && !formOpen && <p role="alert" className="mt-5 text-sm text-red-400">{error}</p>}
                {message && <p role="status" className="mt-5 text-sm text-green-400">{message}</p>}
                {formOpen && <Card className="mt-6 rounded-2xl bg-[#182131] text-white ring-1 ring-[#222d3f]"><CardContent className="px-6"><h2 className="text-lg font-semibold">{editingId ? "Edit" : "Add"} {type === "expense" ? "Expense" : type === "transfer" ? "Transfer" : "Income"}</h2>
                    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
                        {type === "income" && <div><label htmlFor="transaction-title" className="text-sm font-medium">Title</label><input id="transaction-title" type="text" required maxLength={100} value={titleValue} onChange={(event) => setTitleValue(event.target.value)} placeholder="Income title" className={inputClass} /></div>}
                        <div><label htmlFor="transaction-account" className="text-sm font-medium">{type === "transfer" ? "From account" : "Account"}</label><select id="transaction-account" required value={accountId} onChange={(event) => setAccountId(event.target.value)} className={inputClass}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.balance)}</option>)}</select></div>
                        {type === "transfer" && <div><label htmlFor="destination-account" className="text-sm font-medium">To account</label><select id="destination-account" required value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className={inputClass}><option value="">Select an account</option>{accounts.filter((account) => account.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>}
                        <div><label htmlFor="transaction-amount" className="text-sm font-medium">Amount (IDR)</label><RupiahInput id="transaction-amount" required value={amount} onValueChange={setAmount} placeholder="Rp 0" className={inputClass} /></div>
                        <div><label htmlFor="transaction-note" className="text-sm font-medium">{type === "income" ? "Description" : "Note"} <span className="font-normal text-slate-400">(optional)</span></label><input id="transaction-note" type="text" maxLength={160} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What is this for?" className={inputClass} /></div>
                        {error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{error}</p>}
                        <div className="flex gap-3 sm:col-span-2"><button type="submit" className="rounded-lg bg-[#1683f3] px-4 py-2.5 text-sm font-medium hover:bg-blue-600">{editingId ? "Save Changes" : "Save Transaction"}</button><button type="button" onClick={resetForm} className="rounded-lg px-4 py-2.5 text-sm hover:bg-[#26374e]">Cancel</button></div>
                    </form>
                </CardContent></Card>}
                <Card className="mt-6 rounded-2xl bg-[#182131] text-white ring-1 ring-[#222d3f]"><CardContent className="px-6">
                    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold">Transactions</h2><label className="relative block w-full max-w-xs"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search transactions</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" className="h-10 w-full rounded-lg border border-[#34445c] bg-[#101a2a] pr-3 pl-10 text-sm outline-none focus:border-[#1683f3]" /></label></div>
                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm">
                            <thead className="border-b border-[#34445c] text-slate-400">
                                {type === "income" ? <tr>
                                    {(["No", "Title", "Amount", "Bank", "Date", "Description", "Actions"] as const).map((heading) => <th key={heading} scope="col" className="px-2 pb-3 font-medium first:pl-0 last:text-right">{heading}</th>)}
                                </tr> : <tr>
                                    {(["Date", "Account", "Note", "Amount", "Actions"] as const).map((heading) => <th key={heading} scope="col" className="px-2 pb-3 font-medium first:pl-0 last:text-right">{heading}</th>)}
                                </tr>}
                            </thead>
                            <tbody>{visible.map((transaction, index) => <tr key={transaction.id} className="border-b border-[#26374e] last:border-0">
                                {type === "income" ? <>
                                    <td className="py-4 pr-2">{index + 1}</td>
                                    <td className="px-2 py-4">{transaction.title || transaction.note || "Income"}</td>
                                    <td className="px-2 py-4 font-medium">{money(transaction.amount)}</td>
                                    <td className="px-2 py-4">{accountName(transaction.accountId)}</td>
                                    <td className="px-2 py-4 text-slate-300">{new Date(transaction.date).toLocaleDateString("id-ID")}</td>
                                    <td className="px-2 py-4 text-slate-300">{transaction.note || "—"}</td>
                                </> : <>
                                    <td className="py-4 pr-2 text-slate-300">{new Date(transaction.date).toLocaleDateString("id-ID")}</td>
                                    <td className="px-2 py-4">{accountName(transaction.accountId)}{type === "transfer" && <> → {accountName(transaction.destinationId)}</>}</td>
                                    <td className="px-2 py-4 text-slate-300">{transaction.note || "—"}</td>
                                    <td className="px-2 py-4 text-right font-medium">{money(transaction.amount)}</td>
                                </>}
                                <td className="py-4 pl-2"><div className="flex justify-end gap-2"><button type="button" onClick={() => edit(transaction)} aria-label={`Edit transaction ${transaction.id}`} className="rounded-md p-2 text-slate-300 hover:bg-[#26374e] hover:text-white"><Pencil size={16} /></button><button type="button" onClick={() => remove(transaction)} aria-label={`Delete transaction ${transaction.id}`} className="rounded-md p-2 text-red-400 hover:bg-[#26374e]"><Trash2 size={16} /></button></div></td>
                            </tr>)}</tbody>
                        </table>
                        {loaded && visible.length === 0 && <p className="py-8 text-center text-sm text-slate-400">{search ? "No matching transactions." : "No transactions yet."}</p>}
                    </div>
                </CardContent></Card>
            </div>
            <Toast notice={notice} onDismiss={dismissNotice} />
        </main>
    );
}
