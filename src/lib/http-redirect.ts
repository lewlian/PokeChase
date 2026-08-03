import { NextResponse } from "next/server";

/**
 * Redirect to a same-origin path without reconstructing an absolute URL.
 *
 * Behind Railway's proxy a route handler's `request.url` carries the
 * container's bind address (https://0.0.0.0:3000), so
 * `NextResponse.redirect(new URL(path, request.url))` sends the browser to a
 * dead host. A relative Location header (legal per RFC 7231 §7.1.2) is
 * resolved by the browser against the address it actually requested.
 */
export function redirectToPath(path: string, status: 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
