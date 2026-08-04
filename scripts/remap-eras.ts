/**
 * Re-apply era classification to every stored set — run after changing the
 * rules in src/lib/eras.ts so existing rows pick up the new mapping.
 *   npx tsx scripts/remap-eras.ts
 */
import { eq } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { eraForGroup } from "../src/lib/eras";
import { runJob } from "./lib/util";

async function main() {
  const db = getDb();
  await runJob("remap-eras", async () => {
    const sets = db.select().from(tables.sets).all();
    let changed = 0;
    for (const s of sets) {
      const era = eraForGroup({ name: s.name, publishedOn: s.releaseDate });
      if (era !== s.eraId) {
        db.update(tables.sets).set({ eraId: era }).where(eq(tables.sets.groupId, s.groupId)).run();
        console.log(`  ${s.name}: ${s.eraId} -> ${era}`);
        changed++;
      }
    }
    console.log(`  remapped ${changed} sets`);
    return changed;
  });
}

main();
