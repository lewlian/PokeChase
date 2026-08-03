"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCardState } from "./CardStateProvider";

/** Compact star + owned-quantity controls for a table row. */
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
      if (!rootRef.current?.contains(t) && !(t as Element)?.closest?.("[data-watchlist-menu]")) {
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

  const guard = (fn: () => void) => () => {
    if (!ctx.signedIn) {
      ctx.requestSignIn();
      return;
    }
    fn();
  };

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex items-center justify-end gap-1.5">
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
        aria-label={watchedLists.size > 0 ? `${name} is on a watchlist` : `Add ${name} to a watchlist`}
        title={watchedLists.size > 0 ? "On a watchlist" : "Add to watchlist"}
        className={`rounded-full px-2 py-1 text-sm ${
          watchedLists.size > 0
            ? "text-pokeyellowink"
            : "text-mut hover:bg-surface2 hover:text-ink"
        }`}
      >
        {watchedLists.size > 0 ? "★" : "☆"}
      </button>

      <span className="inline-flex items-center rounded-full border border-line">
        <button
          type="button"
          onClick={guard(() => run(() => ctx.setQuantity(productId, variant, Math.max(0, qty - 1))))}
          disabled={busy || (ctx.signedIn && qty === 0)}
          aria-label={`Remove one ${name}`}
          className="px-2 py-0.5 text-sm font-bold text-mut hover:text-ink disabled:opacity-30"
        >
          −
        </button>
        <span className="min-w-5 text-center text-xs font-semibold tabular-nums">{qty}</span>
        <button
          type="button"
          onClick={guard(() => run(() => ctx.setQuantity(productId, variant, qty + 1)))}
          disabled={busy}
          aria-label={`Add one ${name} to portfolio`}
          className="px-2 py-0.5 text-sm font-bold text-mut hover:text-ink disabled:opacity-30"
        >
          +
        </button>
      </span>

      {open && anchor
        ? createPortal(
            <div
              data-watchlist-menu
              className="fixed z-[90] w-52 rounded-xl border border-line bg-surface p-1 text-left shadow-lg"
              style={{ top: anchor.top, right: anchor.right }}
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
