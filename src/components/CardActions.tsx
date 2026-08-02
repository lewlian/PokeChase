"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface WatchlistOption {
  id: string;
  name: string;
  itemCount: number;
}

interface CardState {
  inWatchlists: Array<{ watchlist_id: string; sub_type: string }>;
  owned: Array<{ sub_type: string; quantity: number }>;
}

interface Props {
  productId: number;
  /** Variant names from the card page's price table, best-priced first. */
  variants: string[];
  signedIn: boolean;
}

/** Card-page controls: watchlist star (multi-list picker) + owned-quantity
 *  stepper, per variant. Signed out, both become a sign-in prompt. */
export function CardActions({ productId, variants, signedIn }: Props) {
  const [variant, setVariant] = useState(variants[0] ?? "Normal");
  const [state, setState] = useState<CardState | null>(null);
  const [lists, setLists] = useState<WatchlistOption[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/me/card-state/${productId}`);
    if (res.ok) setState(await res.json());
  }, [productId]);

  useEffect(() => {
    if (!signedIn) return;
    // microtask defers the fetch-then-setState out of the effect body
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [signedIn, refresh]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pickerOpen]);

  async function openPicker() {
    setPickerOpen((v) => !v);
    if (!lists) {
      const res = await fetch("/api/v1/me/watchlists");
      if (res.ok) setLists((await res.json()).watchlists);
    }
  }

  const watchedIn = new Set(
    (state?.inWatchlists ?? []).filter((w) => w.sub_type === variant).map((w) => w.watchlist_id),
  );
  const ownedQty = state?.owned.find((o) => o.sub_type === variant)?.quantity ?? 0;

  async function toggleList(listId: string) {
    const inList = watchedIn.has(listId);
    await fetch(`/api/v1/me/watchlists/${listId}/items`, {
      method: inList ? "DELETE" : "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, subType: variant }),
    });
    await refresh();
  }

  async function setQuantity(quantity: number) {
    if (busy || quantity < 0 || quantity > 9999) return;
    setBusy(true);
    try {
      await fetch("/api/v1/me/portfolio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, subType: variant, quantity }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
        <Link
          href={`/login?next=/cards/${productId}`}
          className="font-semibold text-pokeblue hover:underline"
        >
          Sign in
        </Link>{" "}
        <span className="text-mut">to watch this card or add it to your portfolio.</span>
      </div>
    );
  }

  const watched = watchedIn.size > 0;

  return (
    <div ref={rootRef} className="space-y-3 rounded-2xl border border-line bg-surface p-4 text-sm">
      {variants.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs uppercase tracking-wide text-mut">Variant</span>
          {variants.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                variant === v ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={openPicker}
            aria-expanded={pickerOpen}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${
              watched
                ? "bg-pokeyellow text-[#1c2033]"
                : "border border-line bg-bg hover:bg-surface2"
            }`}
          >
            {watched ? "★ Watching" : "☆ Watch"}
          </button>
          {pickerOpen ? (
            <div className="absolute left-0 top-10 z-40 w-60 rounded-xl border border-line bg-surface p-1 shadow-lg">
              {!lists ? (
                <p className="px-3 py-2 text-mut">Loading…</p>
              ) : (
                <>
                  {lists.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleList(l.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface2"
                    >
                      <span className="truncate font-medium">{l.name}</span>
                      <span className={watchedIn.has(l.id) ? "text-pokeblue" : "text-mut"}>
                        {watchedIn.has(l.id) ? "✓" : "+"}
                      </span>
                    </button>
                  ))}
                  <Link
                    href="/watchlists"
                    className="block rounded-lg px-3 py-2 text-xs font-semibold text-pokeblue hover:bg-surface2"
                  >
                    Manage watchlists →
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-mut">I own</span>
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              onClick={() => setQuantity(ownedQty - 1)}
              disabled={busy || ownedQty === 0}
              aria-label="Decrease quantity"
              className="px-3 py-1.5 font-bold text-mut hover:text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-8 text-center font-semibold tabular-nums">{ownedQty}</span>
            <button
              type="button"
              onClick={() => setQuantity(ownedQty + 1)}
              disabled={busy}
              aria-label="Increase quantity"
              className="px-3 py-1.5 font-bold text-mut hover:text-ink disabled:opacity-40"
            >
              +
            </button>
          </div>
          {ownedQty > 0 ? (
            <Link href="/portfolio" className="text-xs font-semibold text-pokeblue hover:underline">
              In portfolio →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
