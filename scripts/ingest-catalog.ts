/**
 * English catalog sync: TCGCSV groups → sets, products → cards + sealed.
 * Idempotent upserts; safe to re-run any time.
 *   npx tsx scripts/ingest-catalog.ts
 */
import { getDb, tables } from "../src/db";
import { sql } from "drizzle-orm";
import { ERAS, eraForGroup } from "../src/lib/eras";
import { slugify } from "../src/lib/format";
import { upsertGroupProducts } from "./lib/sync";
import {
  categoryBase,
  fetchJson,
  sleep,
  runJob,
  type TcgGroup,
  type TcgResponse,
} from "./lib/util";

const BASE = categoryBase("en");

async function main() {
  const db = getDb();

  await runJob("catalog-sync", async () => {
    // 1. Eras
    for (const e of ERAS) {
      await db
        .insert(tables.eras)
        .values({
          id: e.id,
          name: e.name,
          startYear: e.startYear,
          endYear: e.endYear,
          sortOrder: e.sortOrder,
          accent: e.accent,
        })
        .onConflictDoUpdate({
          target: tables.eras.id,
          set: { name: e.name, sortOrder: e.sortOrder, accent: e.accent },
        });
    }

    // 2. Groups → sets
    const groups = await fetchJson<TcgResponse<TcgGroup>>(`${BASE}/groups`);
    const usedSlugs = new Map<string, number>();
    let written = 0;

    for (const g of groups.results) {
      let slug = slugify(g.name);
      // Guarantee slug uniqueness across groups (dedupe with groupId suffix)
      const existing = usedSlugs.get(slug);
      if (existing !== undefined && existing !== g.groupId) slug = `${slug}-${g.groupId}`;
      usedSlugs.set(slug, g.groupId);

      await db
        .insert(tables.sets)
        .values({
          groupId: g.groupId,
          eraId: eraForGroup(g),
          name: g.name,
          slug,
          abbreviation: g.abbreviation,
          releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
          isSupplemental: !!g.isSupplemental,
        })
        .onConflictDoUpdate({
          target: tables.sets.groupId,
          set: {
            eraId: eraForGroup(g),
            name: g.name,
            abbreviation: g.abbreviation,
            releaseDate: g.publishedOn ? g.publishedOn.slice(0, 10) : null,
            isSupplemental: !!g.isSupplemental,
          },
        });
      written++;
    }
    console.log(`  sets upserted: ${groups.results.length}`);

    // 3. Products per group → cards / sealed
    let i = 0;
    for (const g of groups.results) {
      i++;
      const counts = await upsertGroupProducts(db, BASE, g.groupId);
      written += counts.cards + counts.sealed;
      if (i % 25 === 0) console.log(`  groups processed: ${i}/${groups.results.length}`);
      await sleep(120); // politeness
    }

    const totals = await db.get<{ c: number; s: number }>(
      sql`select (select count(*) from cards) as c, (select count(*) from sealed_products) as s`,
    );
    console.log(`  totals — cards: ${totals?.c}, sealed: ${totals?.s}`);
    return written;
  });
}

main();
