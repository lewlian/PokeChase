/**
 * Japanese catalog sync — ALL of TCGplayer category 85 (via TCGCSV): every
 * Japanese set from the 1996 Expansion Pack to today, catalog + today's
 * prices. Sets are stored with language='jp'; era mapping shares the English
 * rules (JP prefixes handled in src/lib/eras.ts).
 *   npx tsx scripts/ingest-jp.ts
 */
import { eq, and, ne } from "drizzle-orm";
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

/** English and Japanese sets can share a name (Southern Islands, Detective
 *  Pikachu…) — suffix the JP slug when the plain one belongs to another set. */
function slugFor(db: ReturnType<typeof getDb>, g: TcgGroup): string {
  const base = slugify(g.name);
  const clash = db
    .select({ groupId: tables.sets.groupId })
    .from(tables.sets)
    .where(and(eq(tables.sets.slug, base), ne(tables.sets.groupId, g.groupId)))
    .get();
  return clash ? `${base}-jp` : base;
}

async function main() {
  const db = getDb();
  await runJob("jp-sync", async () => {
    const groups = await fetchJson<TcgResponse<TcgGroup>>(`${BASE}/groups`);
    console.log(`  JP groups on TCGplayer: ${groups.results.length}`);

    let written = 0;
    let done = 0;
    const date = todayUTC();
    for (const g of groups.results) {
      await db
        .insert(tables.sets)
        .values({
          groupId: g.groupId,
          eraId: eraForGroup(g),
          name: g.name,
          slug: slugFor(db, g),
          abbreviation: g.abbreviation,
          releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
          isSupplemental: !!g.isSupplemental,
          language: "jp",
        })
        .onConflictDoUpdate({
          target: tables.sets.groupId,
          set: {
            name: g.name,
            eraId: eraForGroup(g),
            releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
            language: "jp",
          },
        });

      const counts = await upsertGroupProducts(db, BASE, g.groupId);
      written += counts.cards + counts.sealed;

      const prices = await fetchJson<TcgResponse<TcgPrice>>(`${BASE}/${g.groupId}/prices`);
      written += insertPriceRows(db, prices.results, date);

      done++;
      if (done % 25 === 0) console.log(`  ${done}/${groups.results.length} groups synced`);
      await sleep(150);
    }
    return written;
  });
}

main();
