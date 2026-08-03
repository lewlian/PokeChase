import Link from "next/link";
import type { Metadata } from "next";
import { CardsTable, type CardsTableRow } from "@/components/CardsTable";
import { CardStateProvider } from "@/components/market/CardStateProvider";
import { EraFilter } from "@/components/market/EraFilter";
import { MarketSearch } from "@/components/market/MarketSearch";
import { RowActions } from "@/components/market/RowActions";
import { getUser } from "@/lib/supabase/server";
import { eraSummaries } from "@/lib/queries";
import { marketScreener, sparkKey, sparklinesFor } from "@/lib/queries-market";
import {
  SCREENER_PAGE_SIZE,
  SCREENER_SORTS,
  parseScreenerParams,
  screenerQuery,
  type ScreenerParams,
} from "@/lib/market-params";

export const metadata: Metadata = { title: "Market — all cards, prices & trends" };

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

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
  const signedIn = (await getUser()) !== null;

  const href = (patch: Partial<ScreenerParams>) =>
    `/market${screenerQuery({ ...p, page: 1, ...patch })}`;
  // current state minus q/page — the search box owns those
  const baseQuery = screenerQuery({ ...p, q: "", page: 1 }).replace(/^\?/, "");
  // …and minus era, which the era dropdown owns
  const eraBaseQuery = screenerQuery({ ...p, eraIds: [], page: 1 }).replace(/^\?/, "");
  // Column-header sort links: clicking the active column flips direction
  const sortHrefs = Object.fromEntries(
    SCREENER_SORTS.map((key) => [
      key,
      href({
        sort: key,
        dir:
          p.sort === key
            ? p.dir === "desc"
              ? "asc"
              : "desc"
            : key === "name"
              ? "asc"
              : "desc",
      }),
    ]),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold">Market</h1>
        <p className="mt-1 text-mut">
          Every tracked card, priced at its most valuable variant — sort like a stock screener.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {eras.length > 0 ? (
          <EraFilter
            eras={eras.map((e) => ({ id: e.id, name: e.name, accent: e.accent }))}
            selected={p.eraIds}
            baseQuery={eraBaseQuery}
          />
        ) : null}
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
        <span className="ml-auto tabular-nums text-mut">
          {total.toLocaleString("en-US")} cards
        </span>
      </div>

      <MarketSearch initialQuery={p.q} baseQuery={baseQuery} />

      {tableRows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-mut">
          {p.q
            ? `No cards match “${p.q}” with these filters — try a different name or card number.`
            : "No cards match these filters."}
        </p>
      ) : (
        <CardStateProvider productIds={tableRows.map((r) => r.productId)} signedIn={signedIn}>
          <CardsTable
            rows={tableRows}
            showSet
            trailingHeader="Track"
            headerSort={{ sort: p.sort, dir: p.dir, hrefs: sortHrefs }}
            trailing={Object.fromEntries(
              tableRows.map((r) => [
                sparkKey(r.productId, r.subType),
                <RowActions
                  key={r.productId}
                  productId={r.productId}
                  subType={r.subType}
                  name={r.name}
                />,
              ]),
            )}
          />
        </CardStateProvider>
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
