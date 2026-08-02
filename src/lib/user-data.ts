import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Row shapes for the Supabase user-data tables (snake_case = DB columns). */
export interface WatchlistRow {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  itemCount: number;
}

export interface WatchlistItemRow {
  product_id: number;
  sub_type: string;
  added_at: string;
}

export interface PortfolioItemRow {
  product_id: number;
  sub_type: string;
  quantity: number;
}

export const DEFAULT_WATCHLIST_NAME = "Watchlist";

type AuthedContext = { supabase: SupabaseClient; user: User };

/** Auth gate for /api/v1/me route handlers: 503 when Supabase isn't
 *  configured, 401 when there's no valid session. */
export async function requireUser(): Promise<AuthedContext | { error: NextResponse }> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Accounts are not configured" }, { status: 503 }),
    };
  }
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  return { supabase, user: data.user };
}

/** All of the user's watchlists with item counts; creates the default
 *  watchlist on first call so every account starts with one. */
export async function listWatchlists(ctx: AuthedContext): Promise<WatchlistRow[]> {
  const select = () =>
    ctx.supabase
      .from("watchlists")
      .select("id, name, is_default, created_at, watchlist_items(count)")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

  let { data, error } = await select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    const { error: insertError } = await ctx.supabase
      .from("watchlists")
      .insert({ user_id: ctx.user.id, name: DEFAULT_WATCHLIST_NAME, is_default: true });
    // A concurrent request may have created it — the re-select below settles it
    if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
    ({ data, error } = await select());
    if (error) throw new Error(error.message);
  }
  return (data ?? []).map((w) => ({
    id: w.id as string,
    name: w.name as string,
    is_default: w.is_default as boolean,
    created_at: w.created_at as string,
    itemCount: (w.watchlist_items as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));
}

export async function watchlistById(
  ctx: AuthedContext,
  id: string,
): Promise<{ id: string; name: string; is_default: boolean } | null> {
  const { data, error } = await ctx.supabase
    .from("watchlists")
    .select("id, name, is_default")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function watchlistItems(
  ctx: AuthedContext,
  watchlistId: string,
): Promise<WatchlistItemRow[]> {
  const { data, error } = await ctx.supabase
    .from("watchlist_items")
    .select("product_id, sub_type, added_at")
    .eq("watchlist_id", watchlistId)
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function portfolioItems(ctx: AuthedContext): Promise<PortfolioItemRow[]> {
  const { data, error } = await ctx.supabase
    .from("portfolio_items")
    .select("product_id, sub_type, quantity")
    .eq("user_id", ctx.user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
