/**
 * Route smoke tests against a running server.
 *   npx tsx scripts/qa-smoke.ts [baseUrl]
 * Exits non-zero on any failure. Samples real ids/slugs from the DB.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

const BASE = process.argv[2] ?? "http://localhost:3010";

interface Check {
  path: string;
  mustContain: string[];
  status?: number;
  /** Accept any of these statuses (e.g. 401 signed-out vs 503 unconfigured). */
  statusAnyOf?: number[];
}

async function main() {
  const db = getDb();
  const sets = db.all<{ slug: string }>(
    sql`select slug from sets where card_count > 50 order by random() limit 5`,
  );
  const card = db.get<{ id: number }>(
    sql`select product_id as id from chase_current order by random() limit 1`,
  )!;
  const sealed = db.get<{ id: number }>(
    sql`select product_id as id from sealed_products where product_type='booster_box' order by random() limit 1`,
  )!;
  const anyCard = db.get<{ id: number }>(
    sql`select product_id as id from cards order by random() limit 1`,
  )!;

  const checks: Check[] = [
    { path: "/", mustContain: ["Know every set", "Browse by era", "Prices updated"] },
    { path: "/sets", mustContain: ["Every set, every era", "Original Series", "Base Set"] },
    ...sets.map((s) => ({
      path: `/sets/${s.slug}`,
      mustContain: ["Chase Cards", "All Cards", "Sealed Products"],
    })),
    ...sets.map((s) => ({
      path: `/sets/${s.slug}?tab=sealed`,
      mustContain: ["Sealed Products"],
    })),
    { path: `/sets/${sets[0].slug}?tab=cards&sort=price`, mustContain: ["Sort:", "cards"] },
    {
      path: `/cards/${card.id}`,
      mustContain: [
        "Market price",
        "Price history",
        "Market vs. current asks",
        "Best ask",
        "Buy on TCGplayer",
        "Raw vs. graded market",
        "Research sold prices",
        "eBay solds (PSA 10)",
      ],
    },
    { path: `/cards/${anyCard.id}`, mustContain: ["Price history", "Raw vs. graded market"] },
    {
      path: `/products/${sealed.id}`,
      mustContain: [
        "Market price",
        "What",
        "Price history",
        "Market vs. current asks",
        "Buy on TCGplayer",
      ],
    },
    { path: "/movers", mustContain: ["Market movers", "Top gainers", "Top losers"] },
    { path: "/search?q=charizard", mustContain: ["Cards", "Charizard"] },
    { path: "/search?q=zzzzqqqq", mustContain: ["Nothing found"] },
    { path: "/learn", mustContain: ["Learn the hobby", "Glossary", "Guide"] },
    { path: "/learn/glossary", mustContain: ["glossary", "terms every" ] },
    { path: "/learn/start-here", mustContain: ["how Pokémon TCG collecting works", "chase cards"] },
    { path: "/learn/grading", mustContain: ["PSA", "slab"] },
    { path: "/learn/nope-does-not-exist", mustContain: ["404"], status: 404 },
    { path: "/cards/999999999", mustContain: ["404"], status: 404 },
    { path: "/products/999999999", mustContain: ["404"], status: 404 },
    { path: `/api/v1/history/${card.id}`, mustContain: ['"points"', '"market"'] },
    { path: "/api/v1/meta", mustContain: ['"sets"', '"latestDate"'] },
    { path: "/api/v1/search?q=charizard", mustContain: ['"cards"', '"sets"', '"sealed"'] },
    { path: "/api/v1/search?q=x", mustContain: ["at least 2"], status: 400 },
    { path: "/api/v1/history/not-a-number", mustContain: ["invalid"], status: 400 },
    // market views
    { path: "/market", mustContain: ["Market", "Min price", "cards", "7d %"] },
    { path: "/market?sort=d7&min=20", mustContain: ["Market", "cards"] },
    { path: "/market?min=100&lang=jp", mustContain: ["Market"] },
    {
      path: `/sets/${sets[0].slug}?tab=cards&view=table`,
      mustContain: ["View:", "Table", "7d %", "30d %", "Trend"],
    },
    // auth surfaces (signed out / unconfigured)
    { path: "/login", mustContain: ["Sign in"] },
    // /api/v1/me: 401 signed out when Supabase is configured, 503 otherwise —
    // never 200 and never a 500
    { path: "/api/v1/me/watchlists", mustContain: ["error"], statusAnyOf: [401, 503] },
    { path: "/api/v1/me/portfolio", mustContain: ["error"], statusAnyOf: [401, 503] },
    { path: `/api/v1/me/card-state/${anyCard.id}`, mustContain: ["error"], statusAnyOf: [401, 503] },
  ];

  let failed = 0;
  for (const c of checks) {
    const expected = c.statusAnyOf ?? [c.status ?? 200];
    try {
      const res = await fetch(BASE + c.path, { signal: AbortSignal.timeout(30_000) });
      const body = await res.text();
      const missing = c.mustContain.filter((m) => !body.includes(m));
      if (!expected.includes(res.status) || missing.length > 0) {
        failed++;
        console.error(
          `FAIL ${c.path} — status ${res.status} (want ${expected.join("/")})${
            missing.length ? `, missing: ${missing.join(" | ")}` : ""
          }`,
        );
      } else {
        console.log(`ok   ${c.path}`);
      }
    } catch (err) {
      failed++;
      console.error(`FAIL ${c.path} — ${err}`);
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} route checks passed`);
  if (failed > 0) process.exit(1);
}

main();
