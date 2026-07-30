/**
 * Catalog sync: TCGCSV groups → sets, products → cards + sealed products.
 * Idempotent upserts; safe to re-run any time.
 *   npx tsx scripts/ingest-catalog.ts
 */
import { getDb, tables } from "../src/db";
import { sql, eq } from "drizzle-orm";
import { ERAS, eraForGroup } from "../src/lib/eras";
import { classifySealed } from "../src/lib/classify";
import { slugify, sortNumber } from "../src/lib/format";
import {
  TCGCSV,
  fetchJson,
  sleep,
  runJob,
  type TcgGroup,
  type TcgProduct,
  type TcgResponse,
  ext,
  isCard,
} from "./lib/util";

const PLACEHOLDER_IMG = "https://tcgplayer-cdn.tcgplayer.com/product/placeholder_200w.jpg";

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
    const groups = await fetchJson<TcgResponse<TcgGroup>>(`${TCGCSV}/groups`);
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
      const prods = await fetchJson<TcgResponse<TcgProduct>>(
        `${TCGCSV}/${g.groupId}/products`,
      );
      const cardRows = [];
      const sealedRows = [];
      for (const p of prods.results) {
        const img = p.imageUrl || PLACEHOLDER_IMG;
        if (isCard(p)) {
          const num = ext(p, "Number");
          cardRows.push({
            productId: p.productId,
            groupId: g.groupId,
            name: p.name,
            number: num,
            sortNumber: sortNumber(num),
            rarity: ext(p, "Rarity"),
            imageUrl: img,
            tcgplayerUrl: p.url,
          });
        } else {
          sealedRows.push({
            productId: p.productId,
            groupId: g.groupId,
            name: p.name,
            productType: classifySealed(p.name),
            imageUrl: img,
            tcgplayerUrl: p.url,
          });
        }
      }
      for (const row of cardRows) {
        await db
          .insert(tables.cards)
          .values(row)
          .onConflictDoUpdate({ target: tables.cards.productId, set: row });
      }
      for (const row of sealedRows) {
        await db
          .insert(tables.sealedProducts)
          .values(row)
          .onConflictDoUpdate({ target: tables.sealedProducts.productId, set: row });
      }
      await db
        .update(tables.sets)
        .set({ cardCount: cardRows.length })
        .where(eq(tables.sets.groupId, g.groupId));

      written += prods.results.length;
      if (i % 25 === 0) console.log(`  groups processed: ${i}/${groups.results.length}`);
      await sleep(120); // politeness
    }

    const counts = await db.get<{ c: number; s: number }>(
      sql`select (select count(*) from cards) as c, (select count(*) from sealed_products) as s`,
    );
    console.log(`  totals — cards: ${counts?.c}, sealed: ${counts?.s}`);
    return written;
  });
}

main();
