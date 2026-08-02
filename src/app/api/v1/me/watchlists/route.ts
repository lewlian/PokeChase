import { NextResponse, type NextRequest } from "next/server";
import { listWatchlists, requireUser } from "@/lib/user-data";
import { cleanWatchlistName } from "@/lib/user-validation";

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;
  try {
    return NextResponse.json({ watchlists: await listWatchlists(ctx) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = cleanWatchlistName((body as { name?: unknown })?.name);
  if (!name) {
    return NextResponse.json(
      { error: "Watchlist name must be 1-40 characters" },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.supabase
    .from("watchlists")
    .insert({ user_id: ctx.user.id, name })
    .select("id, name, is_default, created_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You already have a watchlist with that name" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ watchlist: data }, { status: 201 });
}
