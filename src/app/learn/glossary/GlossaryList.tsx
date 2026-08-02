"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GlossaryTerm } from "@/content/glossary";

export interface TermExample {
  img: string;
  name: string;
  setName: string;
  href: string;
}

const CATEGORIES = [
  "All",
  "Cards & rarity",
  "Products",
  "Condition & grading",
  "Market & collecting",
  "Slang",
] as const;

export function GlossaryList({
  terms,
  examples = {},
}: {
  terms: GlossaryTerm[];
  examples?: Record<string, TermExample>;
}) {
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
          className="w-full rounded-full border border-line bg-surface px-4 py-2 text-base outline-none placeholder:text-mut focus:border-pokeblue sm:w-64 sm:text-sm"
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
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((t) => {
            const ex = examples[t.term];
            return (
              <div key={t.term} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                <div className="min-w-0 flex-1">
                  <dt className="flex items-baseline justify-between gap-2">
                    <span className="font-display font-bold">{t.term}</span>
                    <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-mut">
                      {t.category}
                    </span>
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-mut">{t.def}</dd>
                </div>
                {ex ? (
                  <Link
                    href={ex.href}
                    className="card-hover w-16 shrink-0 self-center"
                    title={`Example: ${ex.name} (${ex.setName})`}
                  >
                    <img
                      src={ex.img}
                      alt={`Example of ${t.term}: ${ex.name}`}
                      loading="lazy"
                      className="aspect-5/7 w-full rounded object-contain"
                    />
                  </Link>
                ) : null}
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
