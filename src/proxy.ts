import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

/** Paths that require a signed-in user (pages redirect; /api/v1/me 401s in
 *  its route handlers, not here). */
const PROTECTED = [/^\/portfolio(\/|$)/, /^\/watchlists(\/|$)/, /^\/account(\/|$)/];

/** Refresh the Supabase session on every app request and gate the
 *  account-only pages. No-op when Supabase isn't configured. */
export async function proxy(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validated against the auth server; also refreshes an expired session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((re) => re.test(path))) {
    // Land on the dashboard with the sign-in modal open rather than swapping
    // the page for a bare login screen; ?next= resumes the original route.
    const home = new URL("/", request.url);
    home.searchParams.set("signin", "1");
    home.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = {
  // Skip static assets entirely; everything else gets a session refresh.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
