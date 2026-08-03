"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCardState } from "./CardStateProvider";

/**
 * Star control for a table row. The popup is the whole collection picker:
 * Portfolio (with a quantity stepper), every watchlist, and an inline
 * "new watchlist" creator. Star is lit when the card is in any collection.
 */
export function RowActions({
  productId,
  subType,
  name,
}: {
  productId: number;
  subType: string | null;
  name: string;
}) {
  const ctx = useCardState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  // The table scrolls horizontally, so an absolutely-positioned menu would be
  // clipped by that container — portal it to the body and pin it to the star.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLButtonElement>(null);
  const variant = subType ?? "Normal";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !(t as Element)?.closest?.("[data-collection-menu]")) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onMove = () => setOpen(false); // scroll/resize invalidates the anchor
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  if (!ctx) return null;

  const state = ctx.stateFor(productId);
  const watchedLists = new Set(
    state.inWatchlists.filter((w) => w.subType === variant).map((w) => w.watchlistId),
  );
  const qty = state.owned.find((o) => o.subType === variant)?.quantity ?? 0;
  const inAnyCollection = watchedLists.size > 0 || qty > 0;

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreateError(null);
    await run(async () => {
      const error = await ctx!.createWatchlist(trimmed);
      if (error) setCreateError(error);
      else setNewName("");
    });
  }

  return (
    <div ref={rootRef} className="flex items-center justify-end">
      <button
        ref={starRef}
        type="button"
        onClick={() => {
          if (!ctx.signedIn) {
            ctx.requestSignIn();
            return;
          }
          const rect = starRef.current?.getBoundingClientRect();
          if (rect) setAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
          setOpen((v) => !v);
        }}
        aria-label={
          inAnyCollection ? `${name} is in your collections` : `Add ${name} to a collection`
        }
        title={inAnyCollection ? "In your collections" : "Add to a collection"}
        className={`rounded-full px-2 py-1 text-base ${
          inAnyCollection ? "text-pokeyellowink" : "text-mut hover:bg-surface2 hover:text-ink"
        }`}
      >
        {inAnyCollection ? "★" : "☆"}
      </button>

      {open && anchor
        ? createPortal(
            <div
              data-collection-menu
              className="fixed z-[90] w-64 rounded-xl border border-line bg-surface p-1 text-left shadow-lg"
              style={{ top: anchor.top, right: anchor.right }}
            >
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-mut">
                Portfolio
              </p>
              <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm">
                <span className="font-medium">I own</span>
                <span className="inline-flex items-center rounded-full border border-line">
                  <button
                    type="button"
                    onClick={() => run(() => ctx.setQuantity(productId, variant, Math.max(0, qty - 1)))}
                    disabled={busy || qty === 0}
                    aria-label={`Remove one ${name}`}
                    className="px-2.5 py-0.5 font-bold text-mut hover:text-ink disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center text-xs font-semibold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => run(() => ctx.setQuantity(productId, variant, qty + 1))}
                    disabled={busy}
                    aria-label={`Add one ${name} to portfolio`}
                    className="px-2.5 py-0.5 font-bold text-mut hover:text-ink disabled:opacity-30"
                  >
                    +
                  </button>
                </span>
              </div>

              <p className="border-t border-line px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-mut">
                Watchlists
              </p>
              {ctx.watchlists.length === 0 ? (
                <p className="px-3 py-2 text-xs text-mut">Loading…</p>
              ) : (
                ctx.watchlists.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => run(() => ctx.toggleWatch(l.id, productId, variant))}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-surface2"
                  >
                    <span className="truncate font-medium">{l.name}</span>
                    <span className={watchedLists.has(l.id) ? "text-pokeblue" : "text-mut"}>
                      {watchedLists.has(l.id) ? "✓" : "+"}
                    </span>
                  </button>
                ))
              )}

              <form onSubmit={createList} className="flex items-center gap-1.5 border-t border-line p-2">
                <input
                  type="text"
                  value={newName}
                  maxLength={40}
                  placeholder="New watchlist…"
                  onChange={(e) => setNewName(e.target.value)}
                  className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 py-1 text-sm outline-none focus:border-pokeblue"
                />
                <button
                  type="submit"
                  disabled={busy || !newName.trim()}
                  className="shrink-0 rounded-full bg-pokeblue px-3 py-1 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              </form>
              {createError ? (
                <p className="px-3 pb-2 text-xs font-medium text-loss">{createError}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
