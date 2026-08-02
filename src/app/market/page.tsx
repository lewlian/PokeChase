import Link from "next/link";
import type { Metadata } from "next";
import { CardsTable, type CardsTableRow } from "@/components/CardsTable";
import { eraSummaries } from "@/lib/queries";
import { marketScreener, sparkKey, sparklinesFor } from "@/lib/queries-market";
import {
  MIN_PRICE_CHOICES,
  SCREENER_PAGE_SIZE,
  parseScreenerParams,
  screenerQuery,
  type ScreenerParams,
  type ScreenerSort,
} from "@/lib/market-params";

export const metadata: Metadata = { title: "Market — all cards, prices & trends" };

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const COLUMNS: Array<[ScreenerSort, string]> = [
  ["name", "Name"],
  ["price", "Price"],
  ["d7", "7d %"],
  ["d30", "30d %"],
];

export default async function MarketPage({ searchParams }: Props) {
  const p = parseScreenerParams(await searchParams);
  const { rows, total } = marketScreener(p);
  const sparks = sparklinesFor(rows.map((r) => ({ productId: r.productId, subType: r.subType })));
  const tableRows: CardsTableRow[] = rows.map((r) => ({
    ...r,
    spark: sparks.get(sparkKey(r.productId, r.subType)) ?? [],
  }));
  const eras = eraSummaries();
  const pageCount = Math.max(1, Math.ceil(total / SCREENER_PAGE_SIZE));

  const href = (patch: Partial<ScreenerParams>) =>
    `/market${screenerQuery({ ...p, page: 1, ...patch })}`;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold">Market</h1>
        <p className="mt-1 text-mut">
          Every tracked card, priced at its most valuable variant — sort like a stock screener.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-mut">Min price:</span>
        {MIN_PRICE_CHOICES.map((m) => (
          <Link
            key={m}
            href={href({ minPrice: m })}
            className={`rounded-full px-3 py-1 font-medium ${
              p.minPrice === m ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            ${m}+
          </Link>
        ))}
        <span className="ml-2 text-mut">Language:</span>
        {(
          [
            [null, "All"],
            ["en", "EN"],
            ["jp", "JP"],
          ] as const
        ).map(([lang, label]) => (
          <Link
            key={label}
            href={href({ language: lang })}
            className={`rounded-full px-3 py-1 font-medium ${
              p.language === lang ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {eras.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-mut">Era:</span>
          <Link
            href={href({ eraId: null })}
            className={`rounded-full px-3 py-1 font-medium ${
              p.eraId === null ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            All
          </Link>
          {eras.map((e) => (
            <Link
              key={e.id}
              href={href({ eraId: e.id })}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                p.eraId === e.id ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: e.accent }} />
              {e.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-mut">Sort:</span>
        {COLUMNS.map(([key, label]) => {
          const active = p.sort === key;
          const nextDir = active && p.dir === "desc" ? "asc" : active ? "desc" : undefined;
          return (
            <Link
              key={key}
              href={href({ sort: key, dir: nextDir ?? (key === "name" ? "asc" : "desc") })}
              className={`rounded-full px-3 py-1 font-medium ${
                active ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
              }`}
            >
              {label}
              {active ? (p.dir === "desc" ? " ↓" : " ↑") : ""}
            </Link>
          );
        })}
        <span className="ml-auto tabular-nums text-mut">
          {total.toLocaleString("en-US")} cards
        </span>
      </div>

      {tableRows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-mut">
          No cards match these filters — try lowering the minimum price.
        </p>
      ) : (
        <CardsTable rows={tableRows} showSet />
      )}

      {pageCount > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {p.page > 1 ? (
            <Link
              href={`/market${screenerQuery({ ...p, page: p.page - 1 })}`}
              className="rounded-full bg-surface2 px-4 py-1.5 font-medium text-mut hover:text-ink"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-mut">
            Page {p.page} of {pageCount.toLocaleString("en-US")}
          </span>
          {p.page < pageCount ? (
            <Link
              href={`/market${screenerQuery({ ...p, page: p.page + 1 })}`}
              className="rounded-full bg-surface2 px-4 py-1.5 font-medium text-mut hover:text-ink"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
