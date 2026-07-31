/**
 * Materialize chase rankings + 7d/30d deltas from the latest snapshot.
 *   npx tsx scripts/compute-chase.ts
 */
import { sql } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { computeChase } from "../src/lib/chase";
import { runJob } from "./lib/util";

async function main() {
  const db = getDb();

  await runJob("compute-chase", async () => {
    const latest = db.get<{ d: string | null }>(
      sql`select max(date) as d from price_snapshots`,
    );
    if (!latest?.d) throw new Error("no price snapshots — run ingest-prices first");
    const date = latest.d;

    // Best market price per card at its own latest snapshot (within 3 days of
    // the global max — robust to partial ingests, e.g. JP sets a day ahead).
    const rows = db.all<{ productId: number; groupId: number; market: number }>(sql`
      select c.product_id as productId, c.group_id as groupId, max(ps.market) as market
      from cards c
      join price_snapshots ps on ps.product_id = c.product_id
        and ps.date = (select max(date) from price_snapshots p2 where p2.product_id = c.product_id)
      where ps.market is not null and ps.date >= date(${date}, '-3 days')
      group by c.product_id
    `);

    // Reference prices ~7 and ~30 days back (closest available date)
    const ref = (daysBack: number) =>
      db.get<{ d: string | null }>(sql`
        select max(date) as d from price_snapshots
        where date <= date(${date}, '-' || ${daysBack} || ' days')
      `)?.d ?? null;
    const d7 = ref(6);
    const d30 = ref(29);

    const past = (refDate: string | null) => {
      if (!refDate) return new Map<number, number>();
      const r = db.all<{ productId: number; market: number }>(sql`
        select c.product_id as productId, max(ps.market) as market
        from cards c
        join price_snapshots ps on ps.product_id = c.product_id and ps.date = ${refDate}
        where ps.market is not null
        group by c.product_id
      `);
      return new Map(r.map((x) => [x.productId, x.market]));
    };
    const past7 = past(d7);
    const past30 = past(d30);

    const overrides = new Map(
      (await db.select().from(tables.chaseOverrides)).map((o) => [o.productId, o]),
    );

    // Group cards by set, tier them, apply overrides
    const bySet = new Map<number, { productId: number; market: number }[]>();
    for (const r of rows) {
      if (overrides.get(r.productId)?.forcedTier === "exclude") continue;
      const arr = bySet.get(r.groupId) ?? [];
      arr.push({ productId: r.productId, market: r.market });
      bySet.set(r.groupId, arr);
    }

    db.run(sql`delete from chase_current`);
    let written = 0;
    for (const [groupId, cardsInSet] of bySet) {
      const tiers = computeChase(cardsInSet);
      for (const t of tiers) {
        const ov = overrides.get(t.productId);
        const tier =
          ov && ov.forcedTier !== "exclude" ? (ov.forcedTier as typeof t.tier) : t.tier;
        const p7 = past7.get(t.productId);
        const p30 = past30.get(t.productId);
        await db.insert(tables.chaseCurrent).values({
          productId: t.productId,
          groupId,
          rank: t.rank,
          tier,
          market: t.market,
          delta7: p7 !== undefined ? t.market - p7 : null,
          delta7Pct: p7 ? ((t.market - p7) / p7) * 100 : null,
          delta30Pct: p30 ? ((t.market - p30) / p30) * 100 : null,
          computedDate: date,
        });
        written++;
      }
    }
    console.log(`  chase rows: ${written} (refs: 7d=${d7}, 30d=${d30})`);
    return written;
  });
}

main();
