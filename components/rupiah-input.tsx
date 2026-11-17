"use client";

import type { InputHTMLAttributes } from "react";

type RupiahInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "inputMode" | "value" | "onChange"
> & {
    value: string;
    onValueChange: (value: string) => void;
};

export function RupiahInput({ value, onValueChange, ...props }: RupiahInputProps) {
    const formatted = value
        ? `Rp ${value.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
        : "";

    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            value={formatted}
            onChange={(event) =>
                onValueChange(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
            }
        />
    );
}
