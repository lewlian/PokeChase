import { spawn } from "node:child_process";

/**
 * In-process daily ingest scheduler for hosted deployments (enabled via
 * ENABLE_DAILY_INGEST=1). Runs the full pipeline at 21:05 UTC — after
 * TCGCSV's ~20:00 UTC refresh — inside the web service, so it shares the
 * service's volume-mounted SQLite database. Locally, launchd does this
 * instead and the flag stays unset.
 */
const HOUR_UTC = 21;
const MINUTE_UTC = 5;

let armed = false;

export function scheduleDailyIngest(): void {
  if (armed) return; // register() can run more than once in dev
  armed = true;

  const arm = () => {
    const now = new Date();
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), HOUR_UTC, MINUTE_UTC, 0),
    );
    if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
    const delayMs = next.getTime() - now.getTime();
    console.log(`[ingest-scheduler] next daily ingest at ${next.toISOString()}`);
    setTimeout(() => {
      run();
      arm();
    }, delayMs).unref?.();
  };

  const run = () => {
    console.log("[ingest-scheduler] starting daily ingest");
    const child = spawn("npx", ["tsx", "scripts/ingest-daily.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      console.log(`[ingest-scheduler] daily ingest exited with code ${code}`);
    });
    child.on("error", (err) => {
      console.error(`[ingest-scheduler] failed to start ingest: ${err}`);
    });
  };

  arm();
}
