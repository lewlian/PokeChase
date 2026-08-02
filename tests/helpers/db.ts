/**
 * DB-backed test fixture: a throwaway on-disk SQLite database, migrated with
 * the real drizzle migrations via getDb()'s self-migration. POKECHASE_DB_PATH
 * must be set before "@/db" is imported, so this module owns the import.
 * getDb() is a module-level singleton, so use one fixture per test file
 * (vitest isolates module registries per file).
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export async function makeTestDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "pokechase-test-"));
  process.env.POKECHASE_DB_PATH = path.join(dir, "test.db");
  const { getDb, tables } = await import("@/db");
  const db = getDb();

  let nextEraSort = 1;
  const seedEra = (id: string, over: Partial<typeof tables.eras.$inferInsert> = {}) =>
    db
      .insert(tables.eras)
      .values({ id, name: id, startYear: 2020, sortOrder: nextEraSort++, ...over })
      .run();

  const seedSet = (
    groupId: number,
    eraId: string,
    over: Partial<typeof tables.sets.$inferInsert> = {},
  ) =>
    db
      .insert(tables.sets)
      .values({ groupId, eraId, name: `Set ${groupId}`, slug: `set-${groupId}`, ...over })
      .run();

  const seedCard = (
    productId: number,
    groupId: number,
    over: Partial<typeof tables.cards.$inferInsert> = {},
  ) =>
    db
      .insert(tables.cards)
      .values({
        productId,
        groupId,
        name: `Card ${productId}`,
        imageUrl: "https://img.example/card.jpg",
        tcgplayerUrl: "https://tcgplayer.example/p",
        ...over,
      })
      .run();

  const seedSnap = (productId: number, subType: string, date: string, market: number | null) =>
    db.insert(tables.priceSnapshots).values({ productId, subType, date, market }).run();

  return { db, tables, seedEra, seedSet, seedCard, seedSnap };
}

/** date helper: `day(0)` = 2026-07-31, `day(7)` = 7 days earlier, etc. */
export function day(daysAgo: number, anchor = "2026-07-31"): string {
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
