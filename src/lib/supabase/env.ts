/** Supabase connection config. Null when the env vars aren't set — every
 *  caller treats that as "auth features disabled" so local dev and container
 *  builds without Supabase keep working (same tolerance as eraSummaries). */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
