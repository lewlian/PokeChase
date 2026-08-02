import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let _client: SupabaseClient | null = null;

/** Browser-side Supabase client (auth UI, OAuth redirects). Null when the
 *  NEXT_PUBLIC_SUPABASE_* vars weren't provided at build time. */
export function getBrowserSupabase(): SupabaseClient | null {
  const env = supabaseEnv();
  if (!env) return null;
  if (!_client) _client = createBrowserClient(env.url, env.anonKey);
  return _client;
}
