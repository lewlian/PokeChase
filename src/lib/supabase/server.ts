import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Request-scoped Supabase client for server components and route handlers.
 *  Null when Supabase isn't configured (auth features render signed-out).
 *
 *  Memoized per request: a second client would carry the original cookies, so
 *  once the first one refreshes an expiring session the stale refresh token
 *  makes every later getUser() fail — which silently rendered pages as
 *  signed-out while the layout showed the user as signed in. */
export const getServerSupabase = cache(async function getServerSupabase(): Promise<SupabaseClient | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        // Server components can't write cookies (only route handlers and
        // server functions can) — the proxy handles session refresh, so a
        // failed write here is safe to ignore.
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {}
      },
    },
  });
});

/** The authenticated user, validated against the Supabase Auth server
 *  (auth.getUser() — never trust the cookie session alone). Memoized per
 *  request so a layout and a page agree on the session. */
export const getUser = cache(async function getUser(): Promise<User | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});
