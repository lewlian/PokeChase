"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Inline owned-quantity stepper for portfolio rows. Reaching 0 removes the
 *  holding (server treats quantity 0 as delete). */
export function QtyStepper({
  productId,
  subType,
  quantity,
}: {
  productId: number;
  subType: string;
  quantity: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: number) {
    if (busy || next < 0 || next > 9999) return;
    if (next === 0 && !window.confirm("Remove this card from your portfolio?")) return;
    setBusy(true);
    try {
      await fetch("/api/v1/me/portfolio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, subType, quantity: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center rounded-full border border-line">
      <button
        type="button"
        onClick={() => set(quantity - 1)}
        disabled={busy}
        aria-label="Decrease quantity"
        className="px-2.5 py-1 font-bold text-mut hover:text-ink disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-7 text-center text-sm font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => set(quantity + 1)}
        disabled={busy}
        aria-label="Increase quantity"
        className="px-2.5 py-1 font-bold text-mut hover:text-ink disabled:opacity-40"
      >
        +
      </button>
    </span>
  );
}
