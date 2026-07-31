/**
 * Daily pipeline: catalog → prices → contents (new products) → chase → logos.
 * Run by launchd/cron after TCGCSV's ~20:00 UTC refresh.
 *   npx tsx scripts/ingest-daily.ts
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const steps = [
  "ingest-catalog.ts",
  "ingest-prices.ts",
  "seed-contents.ts",
  "compute-chase.ts",
  "enrich-logos.ts",
  "ingest-graded.ts", // no-op unless PRICECHARTING_TOKEN is set
];

for (const step of steps) {
  console.log(`\n=== ${step} ===`);
  try {
    execFileSync("npx", ["tsx", path.join(__dirname, step)], {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
  } catch {
    console.error(`daily pipeline failed at ${step}`);
    process.exit(1);
  }
}
console.log("\ndaily pipeline complete");
