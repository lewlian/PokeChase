"use client";

import { useMemo, useState } from "react";
import type { GlossaryTerm } from "@/content/glossary";

const CATEGORIES = [
  "All",
  "Cards & rarity",
  "Products",
  "Condition & grading",
  "Market & collecting",
  "Slang",
] as const;

export function GlossaryList({ terms }: { terms: GlossaryTerm[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const shown = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return terms
      .filter((t) => (cat === "All" ? true : t.category === cat))
      .filter(
        (t) =>
          !needle ||
          t.term.toLowerCase().includes(needle) ||
          t.def.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [terms, q, cat]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter terms…"
          aria-label="Filter glossary terms"
          className="w-64 rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none placeholder:text-mut focus:border-pokeblue"
        />
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cat === c ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs tabular-nums text-mut">
          {shown.length} / {terms.length}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-mut">
          No terms match “{q}”.
        </p>
      ) : (
        <dl className="grid gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <div key={t.term} className="rounded-xl border border-line bg-surface p-4">
              <dt className="flex items-baseline justify-between gap-2">
                <span className="font-display font-bold">{t.term}</span>
                <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-mut">
                  {t.category}
                </span>
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-mut">{t.def}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
