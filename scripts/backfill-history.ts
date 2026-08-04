/**
 * Price-history backfill from TCGCSV daily archives (~4 MB each).
 * Default plan: daily for the last 30 days, then weekly back to ~1 year.
 *   npx tsx scripts/backfill-history.ts [--days 30] [--weeks 52] [--category 3] [--force]
 * --category: TCGplayer category to extract (3 = English, 85 = Japanese).
 * --force: don't skip dates that already have rows (needed when extending an
 *   existing history to a new category — upserts keep it idempotent).
 * Requires 7zz (brew install sevenzip). Without --force, covered dates skip.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** First available 7-Zip binary: 7zz (brew sevenzip), 7z/7za (p7zip on Linux). */
function find7z(): string {
  for (const bin of ["7zz", "7z", "7za"]) {
    try {
      execSync(`command -v ${bin}`, { stdio: "pipe" });
      return bin;
    } catch {
      /* keep looking */
    }
  }
  throw new Error("no 7-Zip binary found — install sevenzip (brew) or p7zip (linux)");
}
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { runJob, sleep, type TcgPrice, type TcgResponse } from "./lib/util";
import { insertPriceRows } from "./lib/prices";

const ARCHIVE = "https://tcgcsv.com/archive/tcgplayer";
const EARLIEST = "2024-02-08"; // first available archive

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function planDates(days: number, weeks: number): string[] {
  const out = new Set<string>();
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.add(fmt(d));
  }
  for (let w = 5; w <= weeks; w++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - w * 7);
    out.add(fmt(d));
  }
  return [...out].filter((d) => d >= EARLIEST).sort();
}

async function main() {
  const argv = process.argv.slice(2);
  const days = Number(argv[argv.indexOf("--days") + 1] || 30);
  const weeks = Number(argv[argv.indexOf("--weeks") + 1] || 52);
  const category = String(argv[argv.indexOf("--category") + 1] || "3");
  const force = argv.includes("--force");
  const db = getDb();

  await runJob("backfill-history", async () => {
    const have = force
      ? new Set<string>()
      : new Set(
          db
            .all<{ date: string }>(sql`select distinct date from price_snapshots`)
            .map((r) => r.date),
        );
    const dates = planDates(days, weeks).filter((d) => !have.has(d));
    console.log(`  category ${category}, dates to backfill: ${dates.length}`);

    const sevenZip = find7z();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pokechase-backfill-"));
    let written = 0;
    let done = 0;
    for (const date of dates) {
      const archivePath = path.join(tmp, `${date}.7z`);
      const url = `${ARCHIVE}/prices-${date}.ppmd.7z`;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(120_000),
          headers: { "user-agent": "pokechase/1.0 (personal collector dashboard)" },
        });
        if (!res.ok) {
          console.warn(`  skip ${date}: HTTP ${res.status}`);
          continue;
        }
        fs.writeFileSync(archivePath, Buffer.from(await res.arrayBuffer()));
        const outDir = path.join(tmp, date);
        // extract only the requested category's price files; old archives
        // predate category 85, so a missing path just means no data that day
        try {
          execFileSync(sevenZip, ["x", archivePath, `-o${outDir}`, `${date}/${category}/*`, "-y"], {
            stdio: "pipe",
          });
        } catch {
          console.warn(`  ${date}: category ${category} not in archive`);
          fs.rmSync(archivePath, { force: true });
          continue;
        }
        const groupsDir = path.join(outDir, date, category);
        if (fs.existsSync(groupsDir)) {
          for (const groupId of fs.readdirSync(groupsDir)) {
            const pricesFile = path.join(groupsDir, groupId, "prices");
            if (!fs.existsSync(pricesFile)) continue;
            const parsed = JSON.parse(
              fs.readFileSync(pricesFile, "utf8"),
            ) as TcgResponse<TcgPrice>;
            written += insertPriceRows(db, parsed.results, date);
          }
        }
        fs.rmSync(outDir, { recursive: true, force: true });
        fs.rmSync(archivePath, { force: true });
        done++;
        if (done % 10 === 0) console.log(`  ${done}/${dates.length} dates loaded`);
        await sleep(250); // politeness to the archive host
      } catch (err) {
        console.warn(`  skip ${date}: ${err}`);
      }
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`  backfilled ${done} dates, ${written} rows`);
    return written;
  });
}

main();
