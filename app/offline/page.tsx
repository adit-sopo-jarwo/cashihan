export default function OfflinePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0f1726] px-5 text-center text-white">
            <div className="max-w-sm">
                <h1 className="text-2xl font-semibold">You are offline</h1>
                <p className="mt-3 text-sm text-slate-300">Cashihan needs a connection to load your saved account data. Reconnect and try again.</p>
                <a href="/dashboard" className="mt-6 inline-block rounded-lg bg-[#1683f3] px-5 py-2.5 text-sm font-medium">Try again</a>
            </div>
        </main>
    );
}
