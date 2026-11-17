export type ReceiptDetails = {
    amount: number | null;
    title: string;
    text: string;
};

function parseRupiah(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, "");
    const withoutDecimals = cleaned.replace(/([.,])00$/, "");
    const amount = Number(withoutDecimals.replace(/[.,]/g, ""));
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function parseReceipt(text: string): ReceiptDetails {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const amountPattern = /(?:rp\.?\s*)?\d[\d.,]*(?:[.,]00)?/gi;
    const totalLine = [...lines].reverse().find((line) =>
        /\b(grand\s*total|total\s*(?:bayar|payment|paid|belanja|harga)?|jumlah\s*(?:bayar|dibayar)?|amount\s*(?:paid|due)?)\b/i.test(line) &&
        !/\b(subtotal|sub total|tax|pajak|kembalian|change)\b/i.test(line) &&
        /\d/.test(line)
    );
    const candidates = totalLine?.match(amountPattern) || [];
    const amount = candidates.map(parseRupiah).filter((value): value is number => value !== null).at(-1) || null;
    const title = lines.find((line) => /[a-zA-Z]{3}/.test(line) && !/\b(receipt|struk|invoice|nota|total)\b/i.test(line))?.slice(0, 100) || "Scanned receipt";
    return { amount, title, text };
}
