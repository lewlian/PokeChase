import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const DB_PATH =
  process.env.POKECHASE_DB_PATH ??
  path.join(process.cwd(), "data", "pokechase.db");

let _db: BetterSQLite3Database<typeof schema> | null = null;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  _db = drizzle(sqlite, { schema });
  return _db;
}

export * as tables from "./schema";
