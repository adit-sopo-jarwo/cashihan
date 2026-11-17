"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/sw.js").catch(() => {
                // The app remains usable if service workers are unavailable.
            });
        }
    }, []);

    return null;
}
