"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Rename / delete controls on a watchlist page. */
export function WatchlistTools({
  watchlistId,
  name,
  isDefault,
}: {
  watchlistId: string;
  name: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/me/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Rename failed");
        return;
      }
      setRenaming(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm(`Delete "${name}" and everything on it?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/me/watchlists/${watchlistId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Delete failed");
        return;
      }
      router.push("/watchlists");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (renaming) {
    return (
      <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          required
          maxLength={40}
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-52 rounded-full border border-line bg-surface px-4 py-1.5 text-sm outline-none focus:border-pokeblue"
        />
        <button type="submit" disabled={busy} className="rounded-full bg-pokeblue px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setRenaming(false);
            setNewName(name);
            setError(null);
          }}
          className="rounded-full bg-surface2 px-4 py-1.5 text-sm font-semibold text-mut hover:text-ink"
        >
          Cancel
        </button>
        {error ? <p className="w-full text-sm font-medium text-loss">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setRenaming(true)}
        className="rounded-full bg-surface2 px-4 py-1.5 text-sm font-semibold text-mut hover:text-ink"
      >
        Rename
      </button>
      {!isDefault ? (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-loss hover:bg-surface2 disabled:opacity-50"
        >
          Delete
        </button>
      ) : null}
      {error ? <p className="text-sm font-medium text-loss">{error}</p> : null}
    </div>
  );
}
