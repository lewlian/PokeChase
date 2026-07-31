import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
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
  const db = drizzle(sqlite, { schema });
  // Self-migrating: fresh deploys get their schema on first open (idempotent,
  // committed SQL in ./drizzle). Replaces drizzle-kit CLI at boot, which
  // proved unreliable in containers.
  const migrations = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrations)) {
    migrate(db, { migrationsFolder: migrations });
  }
  _db = db;
  return _db;
}

export * as tables from "./schema";
