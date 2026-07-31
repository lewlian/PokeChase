/**
 * Japanese Mega-era set sync (TCGplayer category 85 via TCGCSV).
 * Watches groups whose name matches /^M\d/ — the JP Mega Evolution main sets
 * (M2 Inferno X … M6 Storm Emeralda when TCGplayer lists it) — and ingests
 * catalog + today's prices for them. Sets are stored with language='jp'.
 *   npx tsx scripts/ingest-jp.ts
 */
import { getDb, tables } from "../src/db";
import { eraForGroup } from "../src/lib/eras";
import { slugify } from "../src/lib/format";
import { upsertGroupProducts } from "./lib/sync";
import { insertPriceRows } from "./lib/prices";
import {
  categoryBase,
  fetchJson,
  sleep,
  runJob,
  todayUTC,
  type TcgGroup,
  type TcgPrice,
  type TcgResponse,
} from "./lib/util";

const BASE = categoryBase("jp");
const WATCH = /^M\d/i;

async function main() {
  const db = getDb();
  await runJob("jp-sync", async () => {
    const groups = await fetchJson<TcgResponse<TcgGroup>>(`${BASE}/groups`);
    const watched = groups.results.filter((g) => WATCH.test(g.name));
    console.log(`  watched JP groups: ${watched.map((g) => g.name).join(" · ") || "none"}`);

    let written = 0;
    const date = todayUTC();
    for (const g of watched) {
      await db
        .insert(tables.sets)
        .values({
          groupId: g.groupId,
          eraId: eraForGroup(g),
          name: g.name,
          slug: slugify(g.name),
          abbreviation: g.abbreviation,
          releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
          isSupplemental: !!g.isSupplemental,
          language: "jp",
        })
        .onConflictDoUpdate({
          target: tables.sets.groupId,
          set: {
            name: g.name,
            releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
            language: "jp",
          },
        });

      const counts = await upsertGroupProducts(db, BASE, g.groupId);
      written += counts.cards + counts.sealed;

      const prices = await fetchJson<TcgResponse<TcgPrice>>(`${BASE}/${g.groupId}/prices`);
      written += insertPriceRows(db, prices.results, date);
      await sleep(150);
    }
    return written;
  });
}

main();
