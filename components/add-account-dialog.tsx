"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Plus, X } from "lucide-react";
import { useCallback, useState, type SubmitEvent } from "react";
import { Toast, type ToastNotice } from "@/components/ui/toast";
import { RupiahInput } from "@/components/rupiah-input";

export type Account = {
    id: string;
    name: string;
    number: string;
    balance: number;
};

export function AddAccountDialog({ onAdd }: { onAdd: (account: Account) => void | Promise<void> }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [notice, setNotice] = useState<ToastNotice | null>(null);
    const [saving, setSaving] = useState(false);
    const dismissNotice = useCallback(() => setNotice(null), []);

    function resetFields() {
        setName("");
        setNumber("");
        setAmount("");
    }

    function notify(type: ToastNotice["type"], message: string) {
        setNotice({ id: Date.now(), type, message });
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const initialAmount = amount === "" ? 0 : Number(amount);
        if (!name.trim() || !Number.isSafeInteger(initialAmount) || initialAmount < 0) {
            notify("error", "Enter a valid account name and initial amount.");
            return;
        }

        try {
            setSaving(true);
            await onAdd({
                id: crypto.randomUUID(),
                name: name.trim(),
                number: number.trim(),
                balance: initialAmount,
            });
            resetFields();
            setOpen(false);
            notify("success", "Account added successfully.");
        } catch {
            notify("error", "Could not save the account. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    const inputClass = "mt-2 h-11 w-full rounded-lg border border-[#34445c] bg-[#101a2a] px-3 text-white outline-none placeholder:text-slate-500 focus:border-[#1683f3]";

    return (
        <>
        <Dialog.Root open={open} onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) resetFields();
        }}>
            <Dialog.Trigger className="flex h-9 items-center gap-3 rounded-md bg-[#1683f3] px-4 text-sm font-medium hover:bg-blue-600">
                <Plus size={17} strokeWidth={1.8} aria-hidden="true" />
                Add New
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/70" />
                <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2b3950] bg-[#182131] p-6 text-white shadow-2xl">
                    <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold">Add Account</Dialog.Title>
                        <Dialog.Close aria-label="Close dialog" className="rounded-md p-1 text-slate-300 hover:bg-[#26374e] hover:text-white">
                            <X size={20} />
                        </Dialog.Close>
                    </div>
                    <Dialog.Description className="mt-2 text-sm text-slate-400">
                        Add an account and its starting balance.
                    </Dialog.Description>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="account-name" className="block text-sm font-medium">Account name</label>
                            <input id="account-name" type="text" required maxLength={80} autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. M-Banking" className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="account-number" className="block text-sm font-medium">Account number <span className="font-normal text-slate-400">(optional)</span></label>
                            <input id="account-number" type="text" inputMode="numeric" maxLength={40} value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Enter account number" className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="initial-amount" className="block text-sm font-medium">Initial amount (IDR) <span className="font-normal text-slate-400">(optional)</span></label>
                            <RupiahInput id="initial-amount" value={amount} onValueChange={setAmount} placeholder="Rp 0" className={inputClass} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Dialog.Close className="rounded-lg px-4 py-2 text-sm hover:bg-[#26374e]">Cancel</Dialog.Close>
                            <button type="submit" disabled={saving} className="rounded-lg bg-[#1683f3] px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-60">{saving ? "Saving..." : "Add Account"}</button>
                        </div>
                    </form>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
        <Toast notice={notice} onDismiss={dismissNotice} />
        </>
    );
}
