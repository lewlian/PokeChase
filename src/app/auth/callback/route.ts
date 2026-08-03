import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";

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
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    // A replayed callback (browser back/refresh, double-fire) reports the
    // code as spent even though the first exchange succeeded — if a valid
    // session already exists, treat it as success.
    const { data } = await supabase.auth.getUser();
    if (data.user) return NextResponse.redirect(new URL(next, request.url));
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("error", "auth");
  if (providerError) login.searchParams.set("reason", providerError.slice(0, 200));
  return NextResponse.redirect(login);
}
