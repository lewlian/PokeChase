import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { tables } from "../../src/db";
import type * as schema from "../../src/db/schema";
import { classifySealed } from "../../src/lib/classify";
import { sortNumber } from "../../src/lib/format";
import { fetchJson, ext, isCard, type TcgProduct, type TcgResponse } from "./util";

const PLACEHOLDER_IMG = "https://tcgplayer-cdn.tcgplayer.com/product/placeholder_200w.jpg";

/**
 * Fetch a group's products from TCGCSV and upsert cards + sealed products,
 * updating the set's card count. Shared by the EN and JP catalog syncs.
 */
export async function upsertGroupProducts(
  db: BetterSQLite3Database<typeof schema>,
  categoryBase: string,
  groupId: number,
): Promise<{ cards: number; sealed: number }> {
  const prods = await fetchJson<TcgResponse<TcgProduct>>(
    `${categoryBase}/${groupId}/products`,
  );
  let cards = 0;
  let sealed = 0;
  for (const p of prods.results) {
    const img = p.imageUrl || PLACEHOLDER_IMG;
    if (isCard(p)) {
      cards++;
      const num = ext(p, "Number");
      const row = {
        productId: p.productId,
        groupId,
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
      sealed++;
      const row = {
        productId: p.productId,
        groupId,
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
  }
  await db.update(tables.sets).set({ cardCount: cards }).where(eq(tables.sets.groupId, groupId));
  return { cards, sealed };
}
