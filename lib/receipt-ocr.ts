export type ReceiptDetails = {
    amount: number | null;
    title: string;
    text: string;
};

const totalLabel = /\b(grand\s*total|total\s*(?:bayar|payment|paid|belanja|harga|tagihan)?|jumlah\s*(?:bayar|dibayar|belanja)?|amount\s*(?:paid|due)?|tagihan)\b/i;
const excludedLabel = /\b(sub\s*total|tax|pajak|ppn|kembalian|change|diskon|discount|hemat)\b/i;
const moneyPattern = /(?:rp\.?\s*)?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|(?:rp\.?\s*)?\d{3,}(?:[.,]\d{2})?/gi;

function parseRupiah(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, "");
    const withoutDecimals = cleaned.replace(/([.,])\d{2}$/, (ending) => ending === ".00" || ending === ",00" ? "" : ending);
    const amount = Number(withoutDecimals.replace(/[.,]/g, ""));
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function amounts(line: string) {
    return (line.match(moneyPattern) || []).map(parseRupiah).filter((value): value is number => value !== null);
}

export function parseReceipt(text: string): ReceiptDetails {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    let amount: number | null = null;
    for (let index = lines.length - 1; index >= 0; index--) {
        const line = lines[index];
        if (!totalLabel.test(line) || excludedLabel.test(line)) continue;
        const inline = amounts(line.replace(totalLabel, ""));
        const nearby = index + 1 < lines.length && !/[a-z]{3}/i.test(lines[index + 1]) ? amounts(lines[index + 1]) : [];
        amount = inline.at(-1) ?? nearby.at(-1) ?? null;
        if (amount !== null) break;
    }
    const title = lines.find((line) => /[a-zA-Z]{3}/.test(line) && !/\b(receipt|struk|invoice|nota|total)\b/i.test(line))?.slice(0, 100) || "Scanned receipt";
    return { amount, title, text };
}
