import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { tables } from "../../src/db";
import type * as schema from "../../src/db/schema";
import { sql } from "drizzle-orm";
import type { TcgPrice } from "./util";

/** Bulk upsert snapshot rows for one date. Returns rows written. */
export function insertPriceRows(
  db: BetterSQLite3Database<typeof schema>,
  prices: TcgPrice[],
  date: string,
): number {
  if (prices.length === 0) return 0;
  let written = 0;
  const CHUNK = 400;
  for (let i = 0; i < prices.length; i += CHUNK) {
    const chunk = prices.slice(i, i + CHUNK);
    db.insert(tables.priceSnapshots)
      .values(
        chunk.map((p) => ({
          productId: p.productId,
          subType: p.subTypeName,
          date,
          low: p.lowPrice,
          mid: p.midPrice,
          high: p.highPrice,
          market: p.marketPrice,
          directLow: p.directLowPrice,
        })),
      )
      .onConflictDoUpdate({
        target: [
          tables.priceSnapshots.productId,
          tables.priceSnapshots.subType,
          tables.priceSnapshots.date,
        ],
        set: {
          low: sql`excluded.low`,
          mid: sql`excluded.mid`,
          high: sql`excluded.high`,
          market: sql`excluded.market`,
          directLow: sql`excluded.direct_low`,
        },
      })
      .run();
    written += chunk.length;
  }
  return written;
}
