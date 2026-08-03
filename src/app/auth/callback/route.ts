import { type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { redirectToPath } from "@/lib/http-redirect";

/** OAuth / email-confirmation landing: exchange the auth code for a session
 *  cookie, then continue to the sanitized ?next= destination. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  // The provider can bounce back with its own failure (access_denied,
  // flow_state_already_used, …) instead of a code.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const supabase = await getServerSupabase();
  if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectToPath(next);
    // A replayed callback (browser back/refresh, double-fire) reports the
    // code as spent even though the first exchange succeeded — if a valid
    // session already exists, treat it as success.
    const { data } = await supabase.auth.getUser();
    if (data.user) return redirectToPath(next);
  }

  const params = new URLSearchParams({ error: "auth" });
  if (providerError) params.set("reason", providerError.slice(0, 200));
  return redirectToPath(`/login?${params}`);
}
