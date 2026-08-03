"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MAX_QUERY_LEN } from "@/lib/market-params";

/**
 * Live filter for the market table. Debounces into the URL (replace, no
 * scroll) so filtering runs server-side across every card — not just the 50
 * rows on screen — and the filtered view stays shareable.
 */
export function MarketSearch({
  initialQuery,
  baseQuery,
  placeholder = "Filter by name or card number — e.g. Charizard, 113/165",
}: {
  initialQuery: string;
  baseQuery: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  // Reflect external navigation (filter pills, back button) into the input —
  // adjusted during render rather than in an effect, as SiteHeader does.
  const [lastInitial, setLastInitial] = useState(initialQuery);
  if (lastInitial !== initialQuery) {
    setLastInitial(initialQuery);
    setValue(initialQuery);
  }

  useEffect(() => {
    const next = value.trim().slice(0, MAX_QUERY_LEN);
    // The URL already reflects this query (including right after our own
    // navigation lands), so there is nothing to push.
    if (next === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(baseQuery);
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page"); // a new filter starts at page 1
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [value, initialQuery, baseQuery, pathname, router]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="search"
        value={value}
        maxLength={MAX_QUERY_LEN}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Filter cards"
        className="w-full rounded-full border border-line bg-surface px-4 py-2 text-base outline-none focus:border-pokeblue sm:text-sm"
      />
      {pending ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-mut">
          filtering…
        </span>
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear filter"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 text-mut hover:text-ink"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
