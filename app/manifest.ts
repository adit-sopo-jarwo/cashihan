import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Cashihan",
        short_name: "Cashihan",
        description: "Track accounts, income, expenses, and budgets in your Cashihan account.",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#0f1726",
        theme_color: "#0f1726",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
    };
}
