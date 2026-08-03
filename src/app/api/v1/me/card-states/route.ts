import { NextResponse, type NextRequest } from "next/server";
import { listWatchlists, requireUser } from "@/lib/user-data";
import { cleanProductId } from "@/lib/user-validation";

const MAX_IDS = 100;

/**
 * Batch state for a table of cards: the user's watchlists plus, per product,
 * which lists contain it and how many they own. One request hydrates a whole
 * screener page instead of 50 round-trips.
 *   GET /api/v1/me/card-states?ids=1,2,3
 */
export async function GET(request: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => cleanProductId(s.trim()))
    .filter((n): n is number => n !== null)
    .slice(0, MAX_IDS);

  try {
    const watchlists = await listWatchlists(ctx);
    if (ids.length === 0) return NextResponse.json({ watchlists, states: {} });

    const [inLists, owned] = await Promise.all([
      ctx.supabase
        .from("watchlist_items")
        .select("watchlist_id, product_id, sub_type")
        .in("product_id", ids),
      ctx.supabase
        .from("portfolio_items")
        .select("product_id, sub_type, quantity")
        .eq("user_id", ctx.user.id)
        .in("product_id", ids),
    ]);
    if (inLists.error) return NextResponse.json({ error: inLists.error.message }, { status: 500 });
    if (owned.error) return NextResponse.json({ error: owned.error.message }, { status: 500 });

    const states: Record<
      number,
      { inWatchlists: Array<{ watchlistId: string; subType: string }>; owned: Array<{ subType: string; quantity: number }> }
    > = {};
    for (const id of ids) states[id] = { inWatchlists: [], owned: [] };
    for (const w of inLists.data ?? []) {
      states[w.product_id]?.inWatchlists.push({
        watchlistId: w.watchlist_id as string,
        subType: w.sub_type as string,
      });
    }
    for (const o of owned.data ?? []) {
      states[o.product_id]?.owned.push({
        subType: o.sub_type as string,
        quantity: o.quantity as number,
      });
    }
    return NextResponse.json({ watchlists, states });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
