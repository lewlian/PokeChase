import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { portfolioItems } from "@/lib/user-data";
import { batchCards, priceSeriesFor, sparkKey, sparklinesFor } from "@/lib/queries-market";
import { changePct, portfolioSeries } from "@/lib/portfolio";
import { CardsTable, type CardsTableRow } from "@/components/CardsTable";
import { Delta } from "@/components/Delta";
import { PortfolioChart } from "@/components/PortfolioChart";
import { QtyStepper } from "@/components/QtyStepper";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "My portfolio" };

export default async function PortfolioPage() {
  const supabase = await getServerSupabase();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/portfolio");

  const items = await portfolioItems({ supabase, user });

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">My portfolio</h1>
        <div className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-display text-xl font-bold">Nothing tracked yet</p>
          <p className="mx-auto mt-2 max-w-md text-mut">
            Open any card page and use the &ldquo;I own&rdquo; counter to add it here.
            Your portfolio tracks the market value of everything you own, like a
            brokerage account for cardboard.
          </p>
          <Link
            href="/market"
            className="mt-4 inline-block rounded-full bg-pokeblue px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Browse the market
          </Link>
        </div>
      </div>
    );
  }

  const holdings = items.map((i) => ({
    productId: i.product_id,
    subType: i.sub_type,
    quantity: i.quantity,
  }));
  const refs = holdings.map((h) => ({ productId: h.productId, subType: h.subType }));
  const cards = batchCards(refs);
  const sparks = sparklinesFor(refs);
  const seriesPoints = priceSeriesFor(holdings.map((h) => h.productId));
  const series = portfolioSeries(holdings, seriesPoints);

  const qtyOf = new Map(holdings.map((h) => [sparkKey(h.productId, h.subType), h.quantity]));
  const totalValue = cards.reduce(
    (sum, c) => sum + (c.market ?? 0) * (qtyOf.get(sparkKey(c.productId, c.subType)) ?? 0),
    0,
  );
  const totalCards = holdings.reduce((sum, h) => sum + h.quantity, 0);

  const rows: CardsTableRow[] = cards.map((c) => ({
    ...c,
    spark: sparks.get(sparkKey(c.productId, c.subType)) ?? [],
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">My portfolio</h1>
          <p className="mt-1 text-sm tabular-nums text-mut">
            {totalCards} {totalCards === 1 ? "card" : "cards"} across {holdings.length}{" "}
            {holdings.length === 1 ? "holding" : "holdings"}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-surface p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-mut">Total value</p>
          <p className="font-display text-4xl font-bold tabular-nums">{money(totalValue)}</p>
        </div>
        {(
          [
            [1, "1d"],
            [7, "7d"],
            [30, "30d"],
          ] as const
        ).map(([days, label]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wide text-mut">{label} change</p>
            <p className="text-lg">
              <Delta value={changePct(series, days)} />
              {changePct(series, days) === null ? <span className="text-sm text-mut">—</span> : null}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-bold">Value over time</h2>
        <PortfolioChart series={series} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Holdings</h2>
        <CardsTable
          rows={rows}
          showSet
          trailingHeader="Qty"
          renderTrailing={(r) => (
            <span className="inline-flex flex-col items-end gap-1">
              <QtyStepper
                productId={r.productId}
                subType={r.subType ?? "Normal"}
                quantity={qtyOf.get(sparkKey(r.productId, r.subType)) ?? 0}
              />
              <span className="text-xs tabular-nums text-mut">
                ={" "}
                {money(
                  (r.market ?? 0) * (qtyOf.get(sparkKey(r.productId, r.subType)) ?? 0),
                )}
              </span>
            </span>
          )}
        />
      </section>
    </div>
  );
}
