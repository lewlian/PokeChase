"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateWatchlistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/watchlists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Couldn't create the watchlist");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        required
        maxLength={40}
        placeholder="New watchlist name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-56 rounded-full border border-line bg-surface px-4 py-1.5 text-sm outline-none focus:border-pokeblue"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-pokeblue px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create"}
      </button>
      {error ? <p className="w-full text-sm font-medium text-loss">{error}</p> : null}
    </form>
  );
}
