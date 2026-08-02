import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { watchlistById, watchlistItems } from "@/lib/user-data";
import { batchCards, sparkKey, sparklinesFor } from "@/lib/queries-market";
import { CardsTable, type CardsTableRow } from "@/components/CardsTable";
import { AddCardSearch } from "@/components/watchlists/AddCardSearch";
import { RemoveItemButton } from "@/components/watchlists/RemoveItemButton";
import { WatchlistTools } from "@/components/watchlists/WatchlistTools";

export const metadata: Metadata = { title: "Watchlist" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WatchlistPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect(`/login?next=/watchlists/${id}`);

  const ctx = { supabase, user };
  const list = await watchlistById(ctx, id);
  if (!list) notFound();

  const items = await watchlistItems(ctx, id);
  const refs = items.map((i) => ({ productId: i.product_id, subType: i.sub_type }));
  const cards = batchCards(refs); // one row per (product, variant), in ref order
  const sparks = sparklinesFor(
    cards.filter((c) => c.subType).map((c) => ({ productId: c.productId, subType: c.subType })),
  );
  const rows: CardsTableRow[] = cards.map((c) => ({
    ...c,
    spark: sparks.get(sparkKey(c.productId, c.subType)) ?? [],
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{list.name}</h1>
          <p className="mt-1 text-sm tabular-nums text-mut">
            {rows.length} {rows.length === 1 ? "card" : "cards"} watched
          </p>
        </div>
        <WatchlistTools watchlistId={list.id} name={list.name} isDefault={list.is_default} />
      </header>

      <AddCardSearch watchlistId={list.id} />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-mut">
          Nothing here yet — search above, or use the ☆ button on any card page.
        </p>
      ) : (
        <CardsTable
          rows={rows}
          showSet
          renderTrailing={(r) => (
            <RemoveItemButton
              watchlistId={list.id}
              productId={r.productId}
              subType={r.subType ?? "Normal"}
            />
          )}
        />
      )}
    </div>
  );
}
