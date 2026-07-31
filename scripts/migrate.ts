/**
 * Apply pending migrations. The app self-migrates on DB open (src/db/index.ts);
 * this script is the explicit CLI form of the same path, for local dev and CI.
 *   npx tsx scripts/migrate.ts
 */
import { getDb } from "../src/db";

getDb();
console.log("migrations applied");
