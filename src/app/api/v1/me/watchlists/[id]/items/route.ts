import { NextResponse, type NextRequest } from "next/server";
import { requireUser, watchlistById } from "@/lib/user-data";
import { cleanProductId, cleanSubType } from "@/lib/user-validation";

interface Params {
  params: Promise<{ id: string }>;
}

async function parseItem(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const { productId, subType } = (body ?? {}) as { productId?: unknown; subType?: unknown };
  const pid = cleanProductId(productId);
  const st = cleanSubType(subType);
  if (pid === null || st === null) return null;
  return { productId: pid, subType: st };
}

/** Add (idempotently) a card variant to the watchlist. */
export async function PUT(request: NextRequest, { params }: Params) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const item = await parseItem(request);
  if (!item) return NextResponse.json({ error: "productId (integer) required" }, { status: 400 });

  // RLS would silently drop the insert for a foreign watchlist — check
  // explicitly so the caller gets a real 404.
  const list = await watchlistById(ctx, id);
  if (!list) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

  const { error } = await ctx.supabase.from("watchlist_items").upsert(
    { watchlist_id: id, product_id: item.productId, sub_type: item.subType },
    { onConflict: "watchlist_id,product_id,sub_type", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const item = await parseItem(request);
  if (!item) return NextResponse.json({ error: "productId (integer) required" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("watchlist_items")
    .delete()
    .eq("watchlist_id", id)
    .eq("product_id", item.productId)
    .eq("sub_type", item.subType);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
