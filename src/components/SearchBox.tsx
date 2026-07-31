"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";
import { LangChip } from "./LangChip";

interface CompactResults {
  sets: Array<{
    slug: string;
    name: string;
    releaseDate: string | null;
    logoUrl: string | null;
    language: string;
  }>;
  cards: Array<{
    productId: number;
    name: string;
    number: string | null;
    setName: string;
    imageUrl: string;
    market: number | null;
    language: string;
  }>;
  sealed: Array<{
    productId: number;
    name: string;
    setName: string;
    imageUrl: string;
    market: number | null;
    language: string;
  }>;
}

/** Example queries shown when the empty input is focused. */
const SAMPLES: Array<{ label: string; hint: string }> = [
  { label: "Charizard", hint: "a Pokémon, across every set" },
  { label: "Umbreon VMAX", hint: "a specific chase card" },
  { label: "Evolving Skies", hint: "a set" },
  { label: "Prismatic Evolutions Elite Trainer Box", hint: "a sealed product" },
  { label: "151", hint: "set numbers work too" },
];

interface Item {
  href: string;
  label: string;
  sub: string;
  img: string | null;
  price: number | null;
  language: string;
}

export function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CompactResults | null>(null);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const showSamples = open && q.trim().length < 2;

  // Debounced fetch as the user types (short queries are cleared in onChange)
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(needle)}`, {
          signal: ctl.signal,
        });
        if (res.ok) {
          setResults((await res.json()) as CompactResults);
          setActive(-1);
        }
      } catch {
        /* aborted or offline — keep previous state */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const items = useMemo<Item[]>(() => {
    if (!results) return [];
    const out: Item[] = [];
    for (const s of results.sets) {
      out.push({
        href: `/sets/${s.slug}`,
        label: s.name,
        sub: `Set · ${s.releaseDate?.slice(0, 4) ?? ""}`,
        img: s.logoUrl,
        price: null,
        language: s.language,
      });
    }
    for (const c of results.cards) {
      out.push({
        href: `/cards/${c.productId}`,
        label: c.name,
        sub: [c.number, c.setName].filter(Boolean).join(" · "),
        img: imageAt(c.imageUrl, "200w"),
        price: c.market,
        language: c.language,
      });
    }
    for (const p of results.sealed) {
      out.push({
        href: `/products/${p.productId}`,
        label: p.name,
        sub: `Sealed · ${p.setName}`,
        img: imageAt(p.imageUrl, "200w"),
        price: p.market,
        language: p.language,
      });
    }
    return out;
  }, [results]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].href);
      else if (q.trim().length >= 2) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  const hasResults =
    results && (results.sets.length > 0 || results.cards.length > 0 || results.sealed.length > 0);

  return (
    <div ref={rootRef} className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          setOpen(true);
          if (v.trim().length < 2) {
            setResults(null);
            setActive(-1);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search cards & sets…"
        aria-label="Search cards and sets"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-typeahead"
        aria-autocomplete="list"
        className="w-56 rounded-full border border-line bg-bg px-4 py-1.5 text-sm outline-none placeholder:text-mut focus:border-pokeblue lg:w-72"
      />

      {open && (showSamples || q.trim().length >= 2) ? (
        <div
          id="search-typeahead"
          className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        >
          {showSamples ? (
            <div className="p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mut">
                Try searching for…
              </p>
              <ul>
                {SAMPLES.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => setQ(s.label)}
                      className="flex w-full items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface2"
                    >
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="shrink-0 text-xs text-mut">{s.hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : hasResults ? (
            <div role="listbox" aria-label="Search results">
              <ul className="max-h-96 overflow-y-auto py-1">
                {items.map((item, i) => (
                  <li key={item.href} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onClick={() => go(item.href)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 px-3 py-1.5 text-left ${
                        i === active ? "bg-surface2" : ""
                      }`}
                    >
                      <span className="flex h-10 w-8 shrink-0 items-center justify-center">
                        {item.img ? (
                          <img
                            src={item.img}
                            alt=""
                            loading="lazy"
                            className="max-h-full max-w-full rounded object-contain"
                          />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-surface2" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-mut">
                          <LangChip language={item.language} />
                          <span className="truncate">{item.sub}</span>
                        </span>
                      </span>
                      {item.price !== null ? (
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {money(item.price)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
                className="block w-full border-t border-line px-3 py-2 text-left text-sm font-medium text-pokeblue hover:bg-surface2"
              >
                See all results for “{q.trim()}” →
              </button>
            </div>
          ) : (
            <p className="p-4 text-sm text-mut">
              {loading ? "Searching…" : `No matches for “${q.trim()}”.`}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
