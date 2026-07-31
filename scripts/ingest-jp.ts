/**
 * Japanese Mega-era set sync (TCGplayer category 85 via TCGCSV).
 * Watches groups whose name matches /^M\d/ — the JP Mega Evolution main sets
 * (M2 Inferno X … M6 Storm Emeralda when TCGplayer lists it) — and ingests
 * catalog + today's prices for them. Sets are stored with language='jp'.
 *   npx tsx scripts/ingest-jp.ts
 */
import { eq } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { eraForGroup } from "../src/lib/eras";
import { classifySealed } from "../src/lib/classify";
import { slugify, sortNumber } from "../src/lib/format";
import {
  fetchJson,
  sleep,
  runJob,
  todayUTC,
  type TcgGroup,
  type TcgProduct,
  type TcgPrice,
  type TcgResponse,
  ext,
  isCard,
} from "./lib/util";
import { insertPriceRows } from "./lib/prices";

const JP_BASE = "https://tcgcsv.com/tcgplayer/85";
const WATCH = /^M\d/i;
const PLACEHOLDER_IMG = "https://tcgplayer-cdn.tcgplayer.com/product/placeholder_200w.jpg";

async function main() {
  const db = getDb();
  await runJob("jp-sync", async () => {
    const groups = await fetchJson<TcgResponse<TcgGroup>>(`${JP_BASE}/groups`);
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

      const prods = await fetchJson<TcgResponse<TcgProduct>>(
        `${JP_BASE}/${g.groupId}/products`,
      );
      let cardCount = 0;
      for (const p of prods.results) {
        const img = p.imageUrl || PLACEHOLDER_IMG;
        if (isCard(p)) {
          cardCount++;
          const num = ext(p, "Number");
          const row = {
            productId: p.productId,
            groupId: g.groupId,
            name: p.name,
            number: num,
            sortNumber: sortNumber(num),
            rarity: ext(p, "Rarity"),
            imageUrl: img,
            tcgplayerUrl: p.url,
          };
          await db
            .insert(tables.cards)
            .values(row)
            .onConflictDoUpdate({ target: tables.cards.productId, set: row });
        } else {
          const row = {
            productId: p.productId,
            groupId: g.groupId,
            name: p.name,
            productType: classifySealed(p.name),
            imageUrl: img,
            tcgplayerUrl: p.url,
            description: ext(p, "CardText"),
          };
          await db
            .insert(tables.sealedProducts)
            .values(row)
            .onConflictDoUpdate({ target: tables.sealedProducts.productId, set: row });
        }
        written++;
      }
      await db
        .update(tables.sets)
        .set({ cardCount })
        .where(eq(tables.sets.groupId, g.groupId));

      const prices = await fetchJson<TcgResponse<TcgPrice>>(
        `${JP_BASE}/${g.groupId}/prices`,
      );
      written += insertPriceRows(db, prices.results, date);
      await sleep(150);
    }
    return written;
  });
}

main();
