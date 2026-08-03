"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface EraOption {
  id: string;
  name: string;
  accent: string;
}

/** Checkbox dropdown for filtering the market by one or more eras. Selection
 *  lives in the URL (?era=a,b) so it composes with sort/search/pagination. */
export function EraFilter({
  eras,
  selected,
  baseQuery,
}: {
  eras: EraOption[];
  selected: string[];
  /** Current query string minus era & page (they're owned here). */
  baseQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const chosen = new Set(selected);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(next: Set<string>) {
    const params = new URLSearchParams(baseQuery);
    params.delete("page");
    if (next.size > 0) params.set("era", [...next].join(","));
    else params.delete("era");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggle(id: string) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  }

  const label =
    chosen.size === 0
      ? "All eras"
      : chosen.size === 1
        ? (eras.find((e) => e.id === selected[0])?.name ?? "1 era")
        : `${chosen.size} eras`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
          chosen.size > 0 ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
        }`}
      >
        Era: {label}
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-9 z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => apply(new Set())}
            className="w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium text-pokeblue hover:bg-surface2"
          >
            Clear — show all eras
          </button>
          {eras.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-surface2"
            >
              <input
                type="checkbox"
                checked={chosen.has(e.id)}
                onChange={() => toggle(e.id)}
                className="h-3.5 w-3.5 accent-[var(--poke-blue)]"
              />
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.accent }} />
              <span className="truncate font-medium">{e.name}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
