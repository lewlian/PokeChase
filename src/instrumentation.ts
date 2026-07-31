/** Next.js instrumentation hook — runs once when the server boots. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_DAILY_INGEST !== "1") return;
  const { scheduleDailyIngest } = await import("./lib/ingest-scheduler");
  scheduleDailyIngest();
}
