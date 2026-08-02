import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "@/content/guides";
import { GLOSSARY } from "@/content/glossary";

export const metadata: Metadata = { title: "Learn to collect" };

export default function LearnPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Learn the hobby</h1>
        <p className="mt-1 max-w-2xl text-mut">
          Everything a new collector needs: how the TCG is structured, what the
          terminology means, and how to buy, protect, and enjoy cards without getting
          burned.
        </p>
      </header>

      <Link
        href="/learn/glossary"
        className="card-hover block rounded-2xl border-2 border-pokeyellow bg-surface p-6"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-pokeyellowink">
          The reference
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Collector&apos;s Glossary
        </h2>
        <p className="mt-1 text-sm text-mut">
          {GLOSSARY.length} terms explained — from alt arts and SIRs to slabs, pop
          reports, and god packs.
        </p>
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GUIDES.map((g, i) => (
          <Link
            key={g.slug}
            href={`/learn/${g.slug}`}
            className="card-hover flex flex-col rounded-2xl border border-line bg-surface p-5"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-pokeblue">
              Guide {i + 1} · {g.minutes} min read
            </p>
            <h2 className="mt-1 font-display text-lg font-bold leading-snug">{g.title}</h2>
            <p className="mt-1 text-sm text-mut">{g.blurb}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs text-mut">
        Educational content only — nothing here is financial advice.
      </p>
    </div>
  );
}
