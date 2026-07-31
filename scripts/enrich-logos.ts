/**
 * Set-logo enrichment from TCGdex + pokemontcg.io, with manual overrides.
 * Matching: unicode-folded normalization + evidence-based alias map; manual
 * entries in src/content/logo-overrides.json win over everything. Prints an
 * unmatched report (groupId + name) for curating overrides. Best-effort:
 * a source being down just reduces coverage, never fails the pipeline.
 *   npx tsx scripts/enrich-logos.ts
 */
import { eq } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { runJob } from "./lib/util";
import overridesJson from "../src/content/logo-overrides.json";

interface TcgdexSet {
  name: string;
  logo?: string;
}
interface PtcgioSet {
  name: string;
  series: string;
  images?: { logo?: string };
}

function norm(input: string): string {
  let s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  s = s.replace(/^(me|sv|swsh|sm|xy|bw|dp|hs|hgss)\s*\d*\s*[:\-]\s*/, "");
  s = s.replace(/^(ex|hs|dp)\s+/, "");
  s = s.replace(/&/g, "and");
  if (!s.includes("black star")) s = s.replace(/\bpromos?\b/, "black star promos");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  s = s.replace(/\bthe\b/g, "").trim().replace(/\s+/g, " ");
  if (s.endsWith(" base set") && s !== "base set") s = s.slice(0, -9);
  return s;
}

const ALIASES: Record<string, string> = {
  "base set shadowless": "base set",
  "wotc black star promos": "wizards black star promos",
  "best of black star promos": "best of game",
  "rumble": "pokemon rumble",
  "sm": "sun and moon",
  "generations radiant collection": "generations",
  "legendary treasures radiant collection": "legendary treasures",
  "trainer kit 1 latias and latios": "trainer kit latias",
  "trainer kit 2 plusle and minun": "trainer kit 2 plusle",
  "black and white black star promos": "bw black star promos",
  // norm() strips a leading "dp " from source names too, so DP promos land
  // in the pool under the bare key
  "diamond and pearl black star promos": "black star promos",
  "sword and shield black star promos cards": "swsh black star promos",
  "mcdonald s 25th anniversary black star promos": "mcdonald s collection 2021",
};

function applyAliases(key: string): string {
  const aliased = ALIASES[key] ?? key;
  const mcd = aliased.match(/^mcdonald s black star promos (\d{4})$/);
  return mcd ? `mcdonald s collection ${mcd[1]}` : aliased;
}

async function fetchSource<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function main() {
  const db = getDb();
  await runJob("enrich-logos", async () => {
    const pool = new Map<string, string>();

    const dex = await fetchSource<TcgdexSet[]>("https://api.tcgdex.net/v2/en/sets");
    for (const s of dex ?? []) {
      if (s.logo && !pool.has(norm(s.name))) pool.set(norm(s.name), `${s.logo}.png`);
    }

    const pio = await fetchSource<{ data: PtcgioSet[] }>(
      "https://api.pokemontcg.io/v2/sets?pageSize=250&select=name,series,images",
    );
    for (const s of pio?.data ?? []) {
      const logo = s.images?.logo;
      if (!logo) continue;
      if (!pool.has(norm(s.name))) pool.set(norm(s.name), logo);
      const withSeries = norm(`${s.series} ${s.name}`);
      if (!pool.has(withSeries)) pool.set(withSeries, logo);
    }
    console.log(
      `  sources — tcgdex: ${dex ? "ok" : "unreachable"}, pokemontcg.io: ${pio ? "ok" : "unreachable"}, pool: ${pool.size}`,
    );

    const overrides: Record<string, string> = Object.fromEntries(
      Object.entries(overridesJson as Record<string, string>).filter(
        ([k, v]) => /^\d+$/.test(k) && typeof v === "string" && v.startsWith("https://"),
      ),
    );

    const sets = await db.select().from(tables.sets);
    let matched = 0;
    const unmatched: Array<{ groupId: number; name: string; language: string }> = [];
    for (const s of sets) {
      const url =
        overrides[String(s.groupId)] ?? pool.get(applyAliases(norm(s.name)));
      if (url) {
        matched++;
        if (url !== s.logoUrl) {
          await db
            .update(tables.sets)
            .set({ logoUrl: url })
            .where(eq(tables.sets.groupId, s.groupId));
        }
      } else if (!s.logoUrl) {
        unmatched.push({ groupId: s.groupId, name: s.name, language: s.language });
      }
    }

    console.log(`  logos matched: ${matched}/${sets.length} (${overrides ? Object.keys(overrides).length : 0} via overrides)`);
    if (unmatched.length > 0) {
      console.log(`  unmatched (${unmatched.length}) — add to src/content/logo-overrides.json:`);
      for (const u of unmatched.sort((a, b) => a.name.localeCompare(b.name))) {
        console.log(`    ${u.groupId}\t[${u.language}] ${u.name}`);
      }
    }
    return matched;
  });
}

main();
