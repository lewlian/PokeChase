/**
 * Route-handler tests for /api/v1/me/* with a mocked Supabase client (R1-R6).
 * The fake resolves query-builder chains from a per-test result map keyed
 * "table:op"; array values are consumed one call at a time.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

interface FakeOpts {
  user: { id: string; email: string } | null;
  results?: Record<string, Result | Result[]>;
  calls?: string[];
}

function makeFakeSupabase(opts: FakeOpts) {
  const consume = (key: string, fallback: Result): Result => {
    opts.calls?.push(key);
    const r = opts.results?.[key];
    if (r === undefined) return fallback;
    if (Array.isArray(r)) return r.length > 1 ? (r.shift() as Result) : r[0];
    return r;
  };
  const from = (table: string) => {
    const state = { op: "select", single: false };
    const b: Record<string, unknown> = {};
    const chain = (name: string, effect?: () => void) => {
      b[name] = () => {
        effect?.();
        return b;
      };
    };
    chain("select", () => {
      if (state.op === "select") state.op = "select";
    });
    chain("insert", () => (state.op = "insert"));
    chain("update", () => (state.op = "update"));
    chain("delete", () => (state.op = "delete"));
    chain("upsert", () => (state.op = "upsert"));
    chain("eq");
    chain("order");
    chain("maybeSingle", () => (state.single = true));
    chain("single", () => (state.single = true));
    (b as { then: unknown }).then = (resolve: (r: Result) => void) => {
      resolve(
        consume(`${table}:${state.op}`, {
          data: state.single ? null : [],
          error: null,
        }),
      );
    };
    return b;
  };
  return {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from,
  };
}

const USER = { id: "user-1", email: "sean@example.com" };
let fake: ReturnType<typeof makeFakeSupabase> | null = null;

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => fake,
  getUser: async () => null,
}));

function req(method: string, body?: unknown, raw?: string): NextRequest {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json" },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  }) as unknown as NextRequest;
}

const params = (v: Record<string, string>) => ({ params: Promise.resolve(v) }) as never;

beforeEach(() => {
  fake = null;
});

describe("R1: every /api/v1/me handler rejects signed-out requests", () => {
  it("returns 401 with a session-less client and 503 when unconfigured", async () => {
    const watchlists = await import("@/app/api/v1/me/watchlists/route");
    const watchlist = await import("@/app/api/v1/me/watchlists/[id]/route");
    const items = await import("@/app/api/v1/me/watchlists/[id]/items/route");
    const portfolio = await import("@/app/api/v1/me/portfolio/route");
    const cardState = await import("@/app/api/v1/me/card-state/[productId]/route");

    fake = makeFakeSupabase({ user: null });
    const p = params({ id: "w1", productId: "5" });
    const responses = await Promise.all([
      watchlists.GET(),
      watchlists.POST(req("POST", { name: "x" })),
      watchlist.PATCH(req("PATCH", { name: "x" }), p),
      watchlist.DELETE(req("DELETE"), p),
      items.PUT(req("PUT", { productId: 5 }), p),
      items.DELETE(req("DELETE", { productId: 5 }), p),
      portfolio.GET(),
      portfolio.PUT(req("PUT", { productId: 5, quantity: 1 })),
      cardState.GET(req("GET"), p),
    ]);
    for (const r of responses) expect(r.status).toBe(401);

    fake = null; // Supabase not configured at all
    expect((await watchlists.GET()).status).toBe(503);
  });
});

describe("R2: default watchlist is created lazily", () => {
  it("inserts once when the first GET finds no lists", async () => {
    const calls: string[] = [];
    fake = makeFakeSupabase({
      user: USER,
      calls,
      results: {
        "watchlists:select": [
          { data: [], error: null },
          {
            data: [
              {
                id: "w-default",
                name: "Watchlist",
                is_default: true,
                created_at: "2026-08-02",
                watchlist_items: [{ count: 0 }],
              },
            ],
            error: null,
          },
        ],
        "watchlists:insert": { data: null, error: null },
      },
    });
    const { GET } = await import("@/app/api/v1/me/watchlists/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.watchlists).toHaveLength(1);
    expect(json.watchlists[0]).toMatchObject({ name: "Watchlist", is_default: true, itemCount: 0 });
    expect(calls.filter((c) => c === "watchlists:insert")).toHaveLength(1);
  });

  it("does not insert when lists already exist", async () => {
    const calls: string[] = [];
    fake = makeFakeSupabase({
      user: USER,
      calls,
      results: {
        "watchlists:select": {
          data: [
            {
              id: "w1",
              name: "Grails",
              is_default: false,
              created_at: "2026-08-01",
              watchlist_items: [{ count: 3 }],
            },
          ],
          error: null,
        },
      },
    });
    const { GET } = await import("@/app/api/v1/me/watchlists/route");
    const json = await (await GET()).json();
    expect(json.watchlists[0].itemCount).toBe(3);
    expect(calls).not.toContain("watchlists:insert");
  });
});

describe("R3: create watchlist", () => {
  it("returns 201 on success", async () => {
    fake = makeFakeSupabase({
      user: USER,
      results: {
        "watchlists:insert": {
          data: { id: "w2", name: "Grails", is_default: false, created_at: "2026-08-02" },
          error: null,
        },
      },
    });
    const { POST } = await import("@/app/api/v1/me/watchlists/route");
    const res = await POST(req("POST", { name: " Grails " }));
    expect(res.status).toBe(201);
    expect((await res.json()).watchlist.name).toBe("Grails");
  });

  it("maps a unique violation to 409 and invalid names to 400", async () => {
    fake = makeFakeSupabase({
      user: USER,
      results: {
        "watchlists:insert": { data: null, error: { message: "duplicate", code: "23505" } },
      },
    });
    const { POST } = await import("@/app/api/v1/me/watchlists/route");
    expect((await POST(req("POST", { name: "Grails" }))).status).toBe(409);
    expect((await POST(req("POST", { name: "" }))).status).toBe(400);
    expect((await POST(req("POST", { name: "x".repeat(41) }))).status).toBe(400);
  });
});

describe("R4: watchlist items", () => {
  const listExists = {
    "watchlists:select": {
      data: { id: "w1", name: "Grails", is_default: false },
      error: null,
    },
  };

  it("PUT upserts idempotently and DELETE removes", async () => {
    const calls: string[] = [];
    fake = makeFakeSupabase({ user: USER, calls, results: { ...listExists } });
    const { PUT, DELETE } = await import("@/app/api/v1/me/watchlists/[id]/items/route");
    const p = params({ id: "w1" });
    expect((await PUT(req("PUT", { productId: 5 }), p)).status).toBe(200);
    expect((await PUT(req("PUT", { productId: 5 }), p)).status).toBe(200);
    expect(calls.filter((c) => c === "watchlist_items:upsert")).toHaveLength(2);
    expect((await DELETE(req("DELETE", { productId: 5 }), p)).status).toBe(200);
    expect(calls).toContain("watchlist_items:delete");
  });

  it("404s when the watchlist isn't visible (RLS: someone else's list)", async () => {
    fake = makeFakeSupabase({
      user: USER,
      results: { "watchlists:select": { data: null, error: null } },
    });
    const { PUT } = await import("@/app/api/v1/me/watchlists/[id]/items/route");
    expect((await PUT(req("PUT", { productId: 5 }), params({ id: "other" }))).status).toBe(404);
  });

  it("400s on malformed refs", async () => {
    fake = makeFakeSupabase({ user: USER, results: { ...listExists } });
    const { PUT } = await import("@/app/api/v1/me/watchlists/[id]/items/route");
    expect((await PUT(req("PUT", { productId: "abc" }), params({ id: "w1" }))).status).toBe(400);
  });
});

describe("R5+R6: portfolio quantity", () => {
  it("upserts a positive quantity and deletes at zero", async () => {
    const calls: string[] = [];
    fake = makeFakeSupabase({ user: USER, calls });
    const { PUT } = await import("@/app/api/v1/me/portfolio/route");
    const up = await PUT(req("PUT", { productId: 5, quantity: 3 }));
    expect(up.status).toBe(200);
    expect((await up.json()).quantity).toBe(3);
    expect(calls).toContain("portfolio_items:upsert");

    const zero = await PUT(req("PUT", { productId: 5, quantity: 0 }));
    expect(zero.status).toBe(200);
    expect(calls).toContain("portfolio_items:delete");
  });

  it("rejects out-of-range quantities with 400", async () => {
    fake = makeFakeSupabase({ user: USER });
    const { PUT } = await import("@/app/api/v1/me/portfolio/route");
    expect((await PUT(req("PUT", { productId: 5, quantity: -1 }))).status).toBe(400);
    expect((await PUT(req("PUT", { productId: 5, quantity: 10_000 }))).status).toBe(400);
  });

  it("R6: malformed JSON is a 400, not a 500", async () => {
    fake = makeFakeSupabase({ user: USER });
    const { PUT } = await import("@/app/api/v1/me/portfolio/route");
    expect((await PUT(req("PUT", undefined, "{not json"))).status).toBe(400);
    const { POST } = await import("@/app/api/v1/me/watchlists/route");
    expect((await POST(req("POST", undefined, "{not json"))).status).toBe(400);
  });
});
