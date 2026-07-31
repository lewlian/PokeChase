/**
 * Graded-market prices from the PriceCharting API (paid subscription).
 *   PRICECHARTING_TOKEN=... npx tsx scripts/ingest-graded.ts [--limit 500]
 *
 * Exits 0 with a notice when no token is configured, so the daily pipeline
 * can include this step unconditionally. Respects the 1 req/sec API limit.
 * Scope: chase-ranked cards, refreshed on a rolling ~weekly cadence
 * (default 500 cards/run, stalest first). Best-match results are stored only
 * when they pass the plausibleMatch() sanity check.
 */
import { and, eq, sql } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { mapPcProduct, pcQueryFor, plausibleMatch } from "../src/lib/graded";
import { runJob, sleep, todayUTC } from "./lib/util";

const TOKEN = process.env.PRICECHARTING_TOKEN;

async function main() {
  if (!TOKEN) {
    console.log(
      "[graded] PRICECHARTING_TOKEN not set — skipping graded-price ingest.\n" +
        "         Add it to your environment to populate PSA/BGS/CGC markets " +
        "(see README, 'Graded prices').",
    );
    return;
  }
  const db = getDb();
  const argv = process.argv.slice(2);
  const limit = Number(argv[argv.indexOf("--limit") + 1] || 500);

  await runJob("graded-prices", async () => {
    const candidates = db.all<{
      productId: number;
      name: string;
      number: string | null;
      setName: string;
    }>(sql`
      select c.product_id as productId, c.name, c.number, s.name as setName
      from chase_current ch
      join cards c on c.product_id = ch.product_id
      join sets s on s.group_id = ch.group_id
      where ch.tier in ('grail', 'chase')
        and not exists (
          select 1 from graded_prices gp
          where gp.product_id = ch.product_id
            and gp.fetched_at > date('now', '-7 days')
        )
      order by ch.market desc
      limit ${limit}
    `);
    console.log(`  candidates this run: ${candidates.length}`);

    let written = 0;
    let matched = 0;
    let rejected = 0;
    const today = todayUTC();

    for (const card of candidates) {
      const q = pcQueryFor(card);
      try {
        const res = await fetch(
          `https://www.pricecharting.com/api/product?t=${TOKEN}&q=${encodeURIComponent(q)}`,
          { signal: AbortSignal.timeout(30_000) },
        );
        const json = (await res.json()) as Record<string, unknown>;
        if (json.status === "success" && typeof json["product-name"] === "string") {
          const pcName = json["product-name"] as string;
          if (plausibleMatch(pcName, card)) {
            const rows = mapPcProduct(json);
            await db
              .delete(tables.gradedPrices)
              .where(
                and(
                  eq(tables.gradedPrices.productId, card.productId),
                  eq(tables.gradedPrices.source, "pricecharting"),
                ),
              );
            for (const r of rows) {
              await db.insert(tables.gradedPrices).values({
                productId: card.productId,
                source: "pricecharting",
                grade: r.grade,
                price: r.price,
                matchedName: pcName,
                fetchedAt: today,
              });
              written++;
            }
            matched++;
          } else {
            rejected++;
          }
        }
      } catch (err) {
        console.warn(`  skip ${card.name}: ${err}`);
      }
      await sleep(1100); // 1 req/sec API limit
    }
    console.log(`  matched: ${matched}, rejected (implausible): ${rejected}, rows: ${written}`);
    return written;
  });
}

main();
