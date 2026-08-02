import { NextResponse, type NextRequest } from "next/server";
import { requireUser, watchlistById } from "@/lib/user-data";
import { cleanWatchlistName } from "@/lib/user-validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = cleanWatchlistName((body as { name?: unknown })?.name);
  if (!name) {
    return NextResponse.json({ error: "Watchlist name must be 1-40 characters" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("watchlists")
    .update({ name })
    .eq("id", id)
    .select("id, name")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a watchlist with that name" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });
  return NextResponse.json({ watchlist: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  const { id } = await params;

  const existing = await watchlistById(ctx, id);
  if (!existing) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

  const { error } = await ctx.supabase.from("watchlists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
