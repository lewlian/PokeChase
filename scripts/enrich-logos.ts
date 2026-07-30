/**
 * Best-effort set-logo enrichment from TCGdex (matched by normalized name).
 * Unmatched sets simply render a styled fallback — never blocking.
 *   npx tsx scripts/enrich-logos.ts
 */
import { eq } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { fetchJson, runJob } from "./lib/util";

interface TcgdexSet {
  id: string;
  name: string;
  logo?: string;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(me|sv|swsh|sm|xy|bw|dp|hs|ex)\d*\s*:\s*/i, "") // strip "SV08: "
    .replace(/^(sword & shield|scarlet & violet|sun & moon)\s+/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  const db = getDb();
  await runJob("enrich-logos", async () => {
    const dex = await fetchJson<TcgdexSet[]>("https://api.tcgdex.net/v2/en/sets");
    const byName = new Map<string, TcgdexSet>();
    for (const s of dex) if (s.logo) byName.set(norm(s.name), s);

    const sets = await db.select().from(tables.sets);
    let matched = 0;
    for (const s of sets) {
      const hit = byName.get(norm(s.name));
      if (hit?.logo) {
        await db
          .update(tables.sets)
          .set({ logoUrl: `${hit.logo}.png` })
          .where(eq(tables.sets.groupId, s.groupId));
        matched++;
      }
    }
    console.log(`  logos matched: ${matched}/${sets.length}`);
    return matched;
  });
}

main();
