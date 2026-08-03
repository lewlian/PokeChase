/**
 * Auth route handlers must never emit an absolute redirect built from
 * request.url — behind Railway's proxy that resolves to the container's bind
 * address (https://0.0.0.0:3000) and strands the browser.
 */
import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

let fakeSupabase: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => fakeSupabase,
  getUser: async () => null,
}));

const req = (url: string) => new Request(url, { method: "GET" }) as unknown as NextRequest;
const INTERNAL = "https://0.0.0.0:3000";

describe("/auth/callback", () => {
  it("redirects to a relative path on provider error, carrying the reason", async () => {
    fakeSupabase = null;
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(
      req(`${INTERNAL}/auth/callback?error=access_denied&error_description=Denied+by+user`),
    );
    const loc = res.headers.get("location")!;
    expect(loc.startsWith("/login?")).toBe(true);
    expect(loc).not.toContain("0.0.0.0");
    expect(loc).toContain("error=auth");
    // URLSearchParams encodes spaces as "+", so parse rather than decode
    const reason = new URLSearchParams(loc.split("?")[1]).get("reason");
    expect(reason).toBe("Denied by user");
  });

  it("continues to the sanitized next path after a successful exchange", async () => {
    fakeSupabase = {
      auth: {
        exchangeCodeForSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "u1" } } }),
      },
    };
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(req(`${INTERNAL}/auth/callback?code=abc&next=%2Fportfolio`));
    expect(res.headers.get("location")).toBe("/portfolio");
  });

  it("treats a replayed (already-used) code as success when a session exists", async () => {
    fakeSupabase = {
      auth: {
        exchangeCodeForSession: async () => ({ error: { message: "flow state already used" } }),
        getUser: async () => ({ data: { user: { id: "u1" } } }),
      },
    };
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(req(`${INTERNAL}/auth/callback?code=spent&next=%2Fwatchlists`));
    expect(res.headers.get("location")).toBe("/watchlists");
  });

  it("rejects an off-origin next target", async () => {
    fakeSupabase = {
      auth: {
        exchangeCodeForSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user: { id: "u1" } } }),
      },
    };
    const { GET } = await import("@/app/auth/callback/route");
    const res = await GET(
      req(`${INTERNAL}/auth/callback?code=abc&next=${encodeURIComponent("https://evil.example")}`),
    );
    expect(res.headers.get("location")).toBe("/");
  });
});

describe("/auth/signout", () => {
  it("returns a relative 303 so the POST is followed with GET", async () => {
    let signedOut = false;
    fakeSupabase = { auth: { signOut: async () => { signedOut = true; } } };
    const { POST } = await import("@/app/auth/signout/route");
    const res = await POST();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    expect(signedOut).toBe(true);
  });
});
