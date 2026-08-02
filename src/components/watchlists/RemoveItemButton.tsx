"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveItemButton({
  watchlistId,
  productId,
  subType,
}: {
  watchlistId: string;
  productId: number;
  subType: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/me/watchlists/${watchlistId}/items`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, subType }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label="Remove from watchlist"
      title="Remove from watchlist"
      className="rounded-full px-2 py-1 text-mut hover:bg-surface2 hover:text-loss disabled:opacity-50"
    >
      ✕
    </button>
  );
}
