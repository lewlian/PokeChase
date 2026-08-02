import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/user-data";
import { cleanProductId } from "@/lib/user-validation";

interface Params {
  params: Promise<{ productId: string }>;
}

/** Hydrates the card-page action buttons: which of the user's watchlists
 *  contain this card (any variant) and the owned quantity per variant. */
export async function GET(_request: NextRequest, { params }: Params) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  const pid = cleanProductId((await params).productId);
  if (pid === null) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  const [inLists, owned] = await Promise.all([
    ctx.supabase.from("watchlist_items").select("watchlist_id, sub_type").eq("product_id", pid),
    ctx.supabase
      .from("portfolio_items")
      .select("sub_type, quantity")
      .eq("user_id", ctx.user.id)
      .eq("product_id", pid),
  ]);
  if (inLists.error) return NextResponse.json({ error: inLists.error.message }, { status: 500 });
  if (owned.error) return NextResponse.json({ error: owned.error.message }, { status: 500 });

  return NextResponse.json({
    inWatchlists: inLists.data ?? [],
    owned: owned.data ?? [],
  });
}
