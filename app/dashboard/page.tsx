"use client";

import Link from "next/link";
import {
    useEffect,
    useState,
    type SubmitEvent,
} from "react";
import {
    ArrowDown,
    ArrowLeftRight,
    ArrowUp,
    PiggyBank,
    TrendingDown,
    TrendingUp,
    Wallet,
    CalendarDays,
} from "lucide-react";
import {
    AddAccountDialog,
    type Account,
} from "@/components/add-account-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { RupiahInput } from "@/components/rupiah-input";
import { api, loadData } from "@/lib/client-data";

type SavedTransaction = {
    id: string;
    type: "income" | "expense" | "transfer";
    amount: number;
    accountId: string;
    destinationId?: string;
    title?: string;
    note: string;
    date: string;
};
type RecentTab = "all" | SavedTransaction["type"];

const quickActions = [
    {
        label: "Income",
        href: "/dashboard/income",
        icon: ArrowDown,
    },
    {
        label: "Expense",
        href: "/dashboard/expense",
        icon: ArrowUp,
    },
    {
        label: "Transfer",
        href: "/dashboard/transfer",
        icon: ArrowLeftRight,
    },
];

const formatBalance = (value: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);

const transactionMonth = (date: string) => {
    const value = new Date(date);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
};

export default function Dashboard() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<
        SavedTransaction[]
    >([]);
    const [currentMonth, setCurrentMonth] = useState("");
    const [monthlyBudget, setMonthlyBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState("");
    const [editingBudget, setEditingBudget] =
        useState(false);
    const [recentTab, setRecentTab] =
        useState<RecentTab>("all");
    const [budgetError, setBudgetError] = useState("");

    useEffect(() => {
        const frame = window.requestAnimationFrame(
            async () => {
                const today = new Date();
                const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
                setCurrentMonth(month);
                try {
                    const data = await loadData();
                    setAccounts(data.accounts);
                    setTransactions(data.transactions);
                    setMonthlyBudget(
                        data.budgets.find(
                            (budget) =>
                                budget.month === month,
                        )?.amount || 0,
                    );
                } catch {
                    setBudgetError(
                        "Could not load your data. Please refresh the page.",
                    );
                }
            },
        );
        return () => window.cancelAnimationFrame(frame);
    }, []);

    async function addAccount(account: Account) {
        const result = await api<{ account: Account }>(
            "/api/accounts",
            "POST",
            account,
        );
        setAccounts((current) => [
            ...current,
            result.account,
        ]);
    }

    async function saveBudget(
        event: SubmitEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        const value = Number(budgetInput);
        if (
            !budgetInput ||
            !Number.isSafeInteger(value) ||
            value < 0 ||
            !currentMonth
        )
            return;
        try {
            await api("/api/budgets", "PUT", {
                month: currentMonth,
                amount: value,
            });
            setMonthlyBudget(value);
            setEditingBudget(false);
            setBudgetError("");
        } catch {
            setBudgetError(
                "Could not save budget. Please try again.",
            );
        }
    }

    const totalBalance = accounts.reduce(
        (sum, account) => sum + account.balance,
        0,
    );
    const income = transactions
        .filter(
            (transaction) => transaction.type === "income",
        )
        .reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
        );
    const expenses = transactions.filter(
        (transaction) => transaction.type === "expense",
    );
    const totalExpense = expenses.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
    );
    const highestExpense = expenses.reduce(
        (highest, transaction) =>
            Math.max(highest, transaction.amount),
        0,
    );
    const summaries = [
        {
            label: "Income",
            value: income,
            subtitle: "Total recorded income",
            icon: TrendingUp,
        },
        {
            label: "Expense",
            value: totalExpense,
            subtitle: "Total recorded expenses",
            icon: TrendingDown,
        },
        {
            label: "Savings",
            value: totalBalance,
            subtitle: "Across all accounts",
            icon: PiggyBank,
        },
        {
            label: "Highest Expense",
            value: highestExpense,
            subtitle: "Largest single expense",
            icon: Wallet,
        },
    ];
    const monthDate = currentMonth
        ? new Date(`${currentMonth}-01T00:00:00`)
        : null;
    const monthLabel = monthDate
        ? new Intl.DateTimeFormat("en-US", {
              month: "long",
              year: "numeric",
          }).format(monthDate)
        : "This month";
    const monthlyExpense = transactions
        .filter(
            (transaction) =>
                transaction.type === "expense" &&
                transactionMonth(transaction.date) ===
                    currentMonth,
        )
        .reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
        );
    const budgetPercent =
        monthlyBudget > 0
            ? Math.min(
                  (monthlyExpense / monthlyBudget) * 100,
                  100,
              )
            : 0;
    const remainingBudget = Math.max(
        monthlyBudget - monthlyExpense,
        0,
    );
    const recent = transactions
        .filter(
            (transaction) =>
                recentTab === "all" ||
                transaction.type === recentTab,
        )
        .sort(
            (a, b) =>
                Date.parse(b.date) - Date.parse(a.date),
        )
        .slice(0, 5);
    const recentTabs: {
        label: string;
        value: RecentTab;
    }[] = [
        { label: "All", value: "all" },
        { label: "Income", value: "income" },
        { label: "Expenses", value: "expense" },
        { label: "Transfers", value: "transfer" },
    ];
    const accountName = (id?: string) =>
        accounts.find((account) => account.id === id)
            ?.name || "Unknown account";
    const months = monthDate
        ? Array.from({ length: 6 }, (_, index) => {
              const date = new Date(
                  monthDate.getFullYear(),
                  monthDate.getMonth() - 5 + index,
                  1,
              );
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
              return {
                  key,
                  label: new Intl.DateTimeFormat("en-US", {
                      month: "short",
                  }).format(date),
                  income: transactions
                      .filter(
                          (transaction) =>
                              transaction.type ===
                                  "income" &&
                              transactionMonth(
                                  transaction.date,
                              ) === key,
                      )
                      .reduce(
                          (sum, transaction) =>
                              sum + transaction.amount,
                          0,
                      ),
                  expense: transactions
                      .filter(
                          (transaction) =>
                              transaction.type ===
                                  "expense" &&
                              transactionMonth(
                                  transaction.date,
                              ) === key,
                      )
                      .reduce(
                          (sum, transaction) =>
                              sum + transaction.amount,
                          0,
                      ),
              };
          })
        : [];
    const chartMaximum = Math.max(
        1,
        ...months.flatMap((month) => [
            month.income,
            month.expense,
        ]),
    );

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-[#0f1726] p-4 font-sans text-white sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Card className="rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]">
                    <CardContent className="px-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-sm">
                                    Current Balance
                                </p>
                                <h1 className="mt-1 text-2xl font-semibold">
                                    {formatBalance(
                                        totalBalance,
                                    )}
                                </h1>
                            </div>
                            <AddAccountDialog
                                onAdd={addAccount}
                            />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {accounts.map((account) => (
                                <Card
                                    key={account.id}
                                    className="flex h-32 w-56 flex-col gap-0 rounded-2xl bg-gradient-to-br from-[#123473] to-[#2143ad] p-4 text-white ring-0"
                                >
                                    <div className="min-w-0">
                                        <h2
                                            className="truncate text-base font-semibold"
                                            title={
                                                account.name
                                            }
                                        >
                                            {account.name}
                                        </h2>
                                        {account.number && (
                                            <p
                                                className="truncate text-xs text-blue-100"
                                                title={
                                                    account.number
                                                }
                                            >
                                                {
                                                    account.number
                                                }
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-auto">
                                        <p className="text-sm">
                                            Balance
                                        </p>
                                        <p className="mt-1 text-base font-semibold">
                                            {formatBalance(
                                                account.balance,
                                            )}
                                        </p>
                                    </div>
                                </Card>
                            ))}
                            {accounts.length === 0 && (
                                <p className="text-sm text-slate-400">
                                    No accounts yet. Add one
                                    to get started.
                                </p>
                            )}
                        </div>

                        <h2 className="mt-8 text-lg font-semibold">
                            Quick Actions
                        </h2>
                        <nav
                            className="mt-3 grid grid-cols-3 gap-3"
                            aria-label="Quick actions"
                        >
                            {quickActions.map(
                                ({
                                    label,
                                    href,
                                    icon: Icon,
                                }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-[#1e2b3d] text-sm font-medium hover:bg-[#26374e]"
                                    >
                                        <Icon
                                            size={27}
                                            strokeWidth={
                                                1.9
                                            }
                                            aria-hidden="true"
                                        />
                                        <span>{label}</span>
                                    </Link>
                                ),
                            )}
                        </nav>
                    </CardContent>
                </Card>

                <section
                    aria-label="Financial summary"
                    className="grid auto-rows-fr grid-cols-2 gap-4 self-start"
                >
                    {summaries.map(
                        ({
                            label,
                            value,
                            subtitle,
                            icon: Icon,
                        }) => (
                            <Card
                                key={label}
                                className="h-full min-h-40 rounded-2xl bg-[#182131] py-5 text-white ring-1 ring-[#222d3f]"
                            >
                                <CardContent className="flex h-full flex-col px-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h2 className="text-sm text-slate-300">
                                                {label}
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {subtitle}
                                            </p>
                                        </div>
                                        <span className="shrink-0 rounded-lg bg-[#1e2b3d] p-2 text-blue-300">
                                            <Icon
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </div>
                                    <p className="mt-auto wrap-break-word pt-3 text-lg font-semibold">
                                        {formatBalance(
                                            value,
                                        )}
                                    </p>
                                </CardContent>
                            </Card>
                        ),
                    )}
                </section>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Card className="rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]">
                    <CardContent className="px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Statistics
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    Income and expenses over
                                    the last six months
                                </p>
                            </div>
                            <div className="flex gap-4 text-xs text-slate-300">
                                <span className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-[#1683f3]" />
                                    Income
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="size-2.5 rounded-full bg-[#f59e0b]" />
                                    Expenses
                                </span>
                            </div>
                        </div>
                        <div
                            className="mt-8 grid h-52 grid-cols-6 items-end gap-2 sm:gap-5"
                            aria-label="Monthly income and expense chart"
                        >
                            {months.map((month) => (
                                <div
                                    key={month.key}
                                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                                >
                                    <div className="flex h-full w-full items-end justify-center gap-1 sm:gap-2">
                                        <div
                                            title={`${month.label} income: ${formatBalance(month.income)}`}
                                            className="w-1/3 max-w-8 rounded-t-md bg-[#1683f3]"
                                            style={{
                                                height: `${(month.income / chartMaximum) * 100}%`,
                                            }}
                                        />
                                        <div
                                            title={`${month.label} expenses: ${formatBalance(month.expense)}`}
                                            className="w-1/3 max-w-8 rounded-t-md bg-[#f59e0b]"
                                            style={{
                                                height: `${(month.expense / chartMaximum) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {month.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {transactions.length === 0 && (
                            <p className="mt-3 text-center text-xs text-slate-400">
                                Add income or expenses to
                                see your statistics.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]">
                    <CardContent className="px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    This Month Budget
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    {monthLabel} expense
                                    limit
                                </p>
                            </div>
                            <span className="rounded-lg bg-[#1e2b3d] p-2 text-blue-300">
                                <CalendarDays
                                    size={20}
                                    aria-hidden="true"
                                />
                            </span>
                        </div>
                        {budgetError && (
                            <p
                                role="alert"
                                className="mt-3 text-sm text-red-400"
                            >
                                {budgetError}
                            </p>
                        )}
                        {editingBudget ? (
                            <form
                                onSubmit={saveBudget}
                                className="mt-6 flex flex-wrap gap-2"
                            >
                                <label
                                    htmlFor="monthly-budget"
                                    className="sr-only"
                                >
                                    Monthly budget in IDR
                                </label>
                                <RupiahInput
                                    id="monthly-budget"
                                    required
                                    autoFocus
                                    placeholder="Rp 0"
                                    value={budgetInput}
                                    onValueChange={setBudgetInput}
                                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#34445c] bg-[#101a2a] px-3 outline-none focus:border-[#1683f3]"
                                />
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#1683f3] px-4 text-sm font-medium text-white"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingBudget(
                                            false,
                                        )
                                    }
                                    className="rounded-lg px-3 text-sm hover:bg-[#26374e]"
                                >
                                    Cancel
                                </button>
                            </form>
                        ) : (
                            <>
                                <p className="mt-32 text-2xl font-semibold">
                                    {formatBalance(
                                        monthlyBudget,
                                    )}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    Spent{" "}
                                    {formatBalance(
                                        monthlyExpense,
                                    )}{" "}
                                    of{" "}
                                    {formatBalance(
                                        monthlyBudget,
                                    )}
                                </p>
                                <div
                                    role="progressbar"
                                    aria-label="Monthly budget used"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(
                                        budgetPercent,
                                    )}
                                    className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#26374e]"
                                >
                                    <div
                                        className={`h-full rounded-full ${monthlyExpense > monthlyBudget && monthlyBudget > 0 ? "bg-red-400" : "bg-[#1683f3]"}`}
                                        style={{
                                            width: `${budgetPercent}%`,
                                        }}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                                    <span className="text-slate-400">
                                        {monthlyBudget > 0
                                            ? `${formatBalance(remainingBudget)} remaining`
                                            : "Set a monthly budget"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBudgetInput(
                                                String(
                                                    monthlyBudget,
                                                ),
                                            );
                                            setEditingBudget(
                                                true,
                                            );
                                        }}
                                        className="font-medium text-blue-300 hover:text-blue-200"
                                    >
                                        {monthlyBudget > 0
                                            ? "Edit budget"
                                            : "Set budget"}
                                    </button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-5 rounded-2xl bg-[#182131] py-6 text-white ring-1 ring-[#222d3f]">
                <CardContent className="px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Recent Transactions
                            </h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Latest income, expenses, and
                                transfers
                            </p>
                        </div>
                        {recentTab !== "all" && (
                            <Link
                                href={`/dashboard/${recentTab}`}
                                className="text-sm font-medium text-blue-300 hover:text-blue-200"
                            >
                                View all{" "}
                                {recentTab === "expense"
                                    ? "expenses"
                                    : recentTab ===
                                        "transfer"
                                      ? "transfers"
                                      : "income"}
                            </Link>
                        )}
                    </div>
                    <div
                        role="tablist"
                        aria-label="Recent transaction type"
                        className="mt-5 flex flex-wrap gap-2 border-b border-[#34445c] pb-3"
                    >
                        {recentTabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                id={`recent-tab-${tab.value}`}
                                aria-controls="recent-transactions-panel"
                                aria-selected={
                                    recentTab === tab.value
                                }
                                onClick={() =>
                                    setRecentTab(tab.value)
                                }
                                className={`rounded-lg px-3 py-2 text-sm font-medium ${recentTab === tab.value ? "bg-[#1683f3] text-white" : "text-slate-300 hover:bg-[#26374e]"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div
                        id="recent-transactions-panel"
                        role="tabpanel"
                        aria-labelledby={`recent-tab-${recentTab}`}
                    >
                        {recent.length === 0 ? (
                            <p className="mt-6 text-sm text-slate-400">
                                No{" "}
                                {recentTab === "all"
                                    ? "transactions"
                                    : recentTab}{" "}
                                transactions yet.
                            </p>
                        ) : (
                            <ul className="mt-5 divide-y divide-[#34445c]">
                                {recent.map(
                                    (transaction) => {
                                        const action =
                                            quickActions.find(
                                                (item) =>
                                                    item.href.endsWith(
                                                        transaction.type,
                                                    ),
                                            );
                                        const Icon =
                                            action?.icon ||
                                            ArrowLeftRight;
                                        const label =
                                            transaction.type ===
                                            "transfer"
                                                ? `${accountName(transaction.accountId)} → ${accountName(transaction.destinationId)}`
                                                : accountName(
                                                      transaction.accountId,
                                                  );
                                        return (
                                            <li
                                                key={
                                                    transaction.id
                                                }
                                                className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                                            >
                                                <span className="shrink-0 rounded-xl bg-[#1e2b3d] p-2.5 text-blue-300">
                                                    <Icon
                                                        size={
                                                            19
                                                        }
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {transaction.title ||
                                                            transaction.note ||
                                                            transaction.type
                                                                .charAt(
                                                                    0,
                                                                )
                                                                .toUpperCase() +
                                                                transaction.type.slice(
                                                                    1,
                                                                )}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-400">
                                                        {
                                                            label
                                                        }{" "}
                                                        ·{" "}
                                                        {new Date(
                                                            transaction.date,
                                                        ).toLocaleDateString(
                                                            "id-ID",
                                                        )}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`shrink-0 text-sm font-semibold ${transaction.type === "income" ? "text-green-400" : transaction.type === "expense" ? "text-red-400" : ""}`}
                                                >
                                                    {transaction.type ===
                                                    "income"
                                                        ? "+"
                                                        : transaction.type ===
                                                            "expense"
                                                          ? "−"
                                                          : ""}
                                                    {formatBalance(
                                                        transaction.amount,
                                                    )}
                                                </span>
                                            </li>
                                        );
                                    },
                                )}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
