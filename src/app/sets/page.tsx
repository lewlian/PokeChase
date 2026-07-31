import Link from "next/link";
import type { Metadata } from "next";
import { SetLogo } from "@/components/SetLogo";
import { shortDate } from "@/lib/format";
import { erasWithSets } from "@/lib/queries";

export const metadata: Metadata = { title: "All sets by era" };

export default function SetsPage() {
  const eras = erasWithSets();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold">Every set, every era</h1>
        <p className="mt-1 text-mut">
          The complete English Pokémon TCG release history, grouped by collecting era.
        </p>
      </header>

      {/* jump nav */}
      <nav className="flex flex-wrap gap-2 text-xs font-semibold">
        {eras.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            className="rounded-full border border-line bg-surface px-3 py-1 text-mut hover:text-ink"
          >
            {e.name}
          </a>
        ))}
      </nav>

      {eras.map((era) => (
        <section key={era.id} id={era.id} className="scroll-mt-20">
          <div className="mb-3 flex items-baseline gap-3">
            <span className="h-3 w-3 rounded-full" style={{ background: era.accent }} />
            <h2 className="font-display text-2xl font-bold">{era.name}</h2>
            <span className="text-sm tabular-nums text-mut">
              {era.startYear}–{era.endYear ?? "now"} · {era.sets.length} sets
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {era.sets.map((s) => (
              <Link
                key={s.groupId}
                href={`/sets/${s.slug}`}
                className="card-hover flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
              >
                <div className="flex h-12 w-24 shrink-0 items-center justify-center">
                  <SetLogo logoUrl={s.logoUrl} name={s.name} accent={era.accent} className="h-12" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold" title={s.name}>
                    <span className="truncate">{s.name}</span>
                    {s.language === "jp" ? (
                      <span className="shrink-0 rounded bg-pokered px-1 py-px text-[9px] font-bold uppercase text-white">
                        JP
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-mut">
                    {shortDate(s.releaseDate)}
                    {s.cardCount ? ` · ${s.cardCount} cards` : ""}
                    {s.isSupplemental ? " · supplemental" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
