/**
 * Daily price snapshot from TCGCSV live endpoints (one file per set).
 * Snapshot date = today (UTC) — TCGCSV refreshes ~20:00 UTC.
 *   npx tsx scripts/ingest-prices.ts
 */
import { getDb, tables } from "../src/db";
import {
  TCGCSV,
  fetchJson,
  sleep,
  runJob,
  todayUTC,
  type TcgPrice,
  type TcgResponse,
} from "./lib/util";
import { insertPriceRows } from "./lib/prices";

async function main() {
  const db = getDb();
  const date = todayUTC();

  await runJob("prices-daily", async () => {
    const sets = await db
      .select({ groupId: tables.sets.groupId, language: tables.sets.language })
      .from(tables.sets);
    let written = 0;
    let i = 0;
    for (const s of sets) {
      i++;
      // JP sets live under TCGplayer category 85; English under 3.
      const base = s.language === "jp" ? TCGCSV.replace("/3", "/85") : TCGCSV;
      const prices = await fetchJson<TcgResponse<TcgPrice>>(
        `${base}/${s.groupId}/prices`,
      );
      written += insertPriceRows(db, prices.results, date);
      if (i % 40 === 0) console.log(`  groups: ${i}/${sets.length}`);
      await sleep(100);
    }
    console.log(`  snapshot rows for ${date}: ${written}`);
    return written;
  });
}

main();
