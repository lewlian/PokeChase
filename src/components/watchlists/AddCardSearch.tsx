"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchCard {
  productId: number;
  name: string;
  number: string | null;
  setName: string;
  language: string;
  market: number | null;
}

/** Search-and-add box on a watchlist page (SearchBox's fetch pattern:
 *  debounce + AbortController against /api/v1/search). */
export function AddCardSearch({ watchlistId }: { watchlistId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchCard[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    const timer = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, {
          signal: ac.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setResults(json.cards ?? []);
        }
      } catch {
        // aborted or offline — keep previous results
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  async function add(card: SearchCard) {
    setAddedId(card.productId);
    await fetch(`/api/v1/me/watchlists/${watchlistId}/items`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: card.productId }),
    });
    router.refresh();
    setTimeout(() => setAddedId(null), 1500);
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={q}
        placeholder="Add a card — search by name…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-full border border-line bg-surface px-4 py-2 text-base outline-none focus:border-pokeblue sm:text-sm"
      />
      {open && q.trim().length >= 2 ? (
        <div className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-mut">{loading ? "Searching…" : "No matches"}</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((c) => (
                <li key={c.productId}>
                  <button
                    type="button"
                    onClick={() => add(c)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-mut">
                        {[c.number, c.setName].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-pokeblue">
                      {addedId === c.productId ? "Added ✓" : "+ Add"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
