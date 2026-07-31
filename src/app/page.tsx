import Link from "next/link";
import { CardTile } from "@/components/CardTile";
import { LangChip } from "@/components/LangChip";
import { SetLogo } from "@/components/SetLogo";
import { Delta } from "@/components/Delta";
import { money, shortDate, yearOf } from "@/lib/format";
import { imageAt } from "@/lib/images";
import {
  erasWithSets,
  movers,
  newestSets,
  siteStats,
  topChaseGlobal,
} from "@/lib/queries";


export default function HomePage() {
  const stats = siteStats();
  const top = topChaseGlobal(8);
  const up = movers("up", 6);
  const down = movers("down", 6);
  const newest = newestSets(6);
  const eras = erasWithSets();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-pokeblue">
          Pokémon TCG market dashboard
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          Know every set. <span className="text-pokeblue">Chase</span> the right cards.
        </h1>
        <p className="mt-3 max-w-2xl text-mut">
          Every English series since 1999 — the cards worth hitting in each set, sealed
          product values, and daily-refreshed TCGplayer market prices.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          {[
            [stats.sets.toLocaleString(), "sets"],
            [stats.cards.toLocaleString(), "cards tracked"],
            [stats.sealed.toLocaleString(), "sealed products"],
            [stats.snaps.toLocaleString(), "price points"],
          ].map(([n, label]) => (
            <div key={label}>
              <div className="font-display text-2xl font-bold tabular-nums">{n}</div>
              <div className="text-xs uppercase tracking-wide text-mut">{label}</div>
            </div>
          ))}
          <div className="ml-auto self-end rounded-full bg-surface2 px-3 py-1 text-xs text-mut">
            Prices updated {shortDate(stats.latestDate)}
          </div>
        </div>
      </section>

      {/* Era timeline — desktop uses the left sidebar; keep this for mobile */}
      <section className="lg:hidden">
        <h2 className="mb-3 font-display text-xl font-bold">Browse by era</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {eras
            .filter((e) => e.id !== "other")
            .map((e) => (
              <Link
                key={e.id}
                href={`/sets#${e.id}`}
                className="card-hover shrink-0 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span
                  className="mb-1 block h-1.5 w-10 rounded-full"
                  style={{ background: e.accent }}
                />
                <span className="block text-sm font-semibold">{e.name}</span>
                <span className="block text-xs tabular-nums text-mut">
                  {e.startYear}–{e.endYear ?? "now"} · {e.sets.length} sets
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* Top chase cards */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Biggest chase cards right now</h2>
          <Link href="/sets" className="text-sm font-medium text-pokeblue hover:underline">
            All sets →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {top.map((c) => (
            <CardTile
              key={c.productId}
              {...c}
              rank={undefined}
              setName={c.setName}
              language={c.language}
            />
          ))}
        </div>
      </section>

      {/* Movers */}
      {up.length > 0 || down.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold">7-day movers</h2>
            <Link href="/movers" className="text-sm font-medium text-pokeblue hover:underline">
              All movers →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Gainers", rows: up },
              { title: "Losers", rows: down },
            ].map((col) => (
              <div key={col.title} className="rounded-xl border border-line bg-surface p-4">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-mut">
                  {col.title}
                </h3>
                <ul className="divide-y divide-line">
                  {col.rows.map((m) => (
                    <li key={m.productId}>
                      <Link
                        href={m.kind === "card" ? `/cards/${m.productId}` : `/products/${m.productId}`}
                        className="flex items-center gap-3 py-2 hover:bg-surface2"
                      >
                        <img
                          src={imageAt(m.imageUrl, "200w")}
                          alt=""
                          loading="lazy"
                          className="h-10 w-8 rounded object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-mut">
                            <LangChip language={m.language} />
                            <span className="truncate">{m.setName}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums">{money(m.cur)}</div>
                          <Delta value={m.pct} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Newest sets */}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Newest sets</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {newest.map((s) => (
            <Link
              key={s.groupId}
              href={`/sets/${s.slug}`}
              className="card-hover flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-4 text-center"
            >
              <SetLogo logoUrl={s.logoUrl} name={s.name} className="h-14" />
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {s.name} <LangChip language={s.language} />
              </span>
              <span className="text-xs text-mut">
                {yearOf(s.releaseDate)} · {s.cardCount} cards
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
