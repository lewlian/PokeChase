import { NextResponse, type NextRequest } from "next/server";
import { portfolioItems, requireUser } from "@/lib/user-data";
import { cleanProductId, cleanQuantity, cleanSubType } from "@/lib/user-validation";

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  try {
    return NextResponse.json({ items: await portfolioItems(ctx) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Set the owned quantity of a card variant. quantity 0 removes it. */
export async function PUT(request: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { productId, subType, quantity } = (body ?? {}) as Record<string, unknown>;
  const pid = cleanProductId(productId);
  const st = cleanSubType(subType);
  const qty = cleanQuantity(quantity);
  if (pid === null || st === null || qty === null) {
    return NextResponse.json(
      { error: "productId (integer) and quantity (0-9999) required" },
      { status: 400 },
    );
  }

  if (qty === 0) {
    const { error } = await ctx.supabase
      .from("portfolio_items")
      .delete()
      .eq("user_id", ctx.user.id)
      .eq("product_id", pid)
      .eq("sub_type", st);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, quantity: 0 });
  }

  const { error } = await ctx.supabase.from("portfolio_items").upsert(
    {
      user_id: ctx.user.id,
      product_id: pid,
      sub_type: st,
      quantity: qty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id,sub_type" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, quantity: qty });
}
