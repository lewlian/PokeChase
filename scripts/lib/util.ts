import { getDb, tables } from "../../src/db";
import { eq } from "drizzle-orm";

export const TCGCSV_ROOT = "https://tcgcsv.com/tcgplayer";

/** TCGplayer category ids per catalog language. */
export const CATEGORY = { en: 3, jp: 85 } as const;

export function categoryBase(language: keyof typeof CATEGORY): string {
  return `${TCGCSV_ROOT}/${CATEGORY[language]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchJson<T = unknown>(
  url: string,
  { retries = 3, timeoutMs = 45_000 }: { retries?: number; timeoutMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "pokechase/1.0 (personal collector dashboard)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr;
}

/** Wrap a job with job_runs bookkeeping. Returns items written. */
export async function runJob(
  job: string,
  fn: () => Promise<number>,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .insert(tables.jobRuns)
    .values({ job, startedAt: new Date().toISOString(), status: "running" })
    .returning({ id: tables.jobRuns.id });
  try {
    const items = await fn();
    await db
      .update(tables.jobRuns)
      .set({ status: "ok", finishedAt: new Date().toISOString(), itemsWritten: items })
      .where(eq(tables.jobRuns.id, row.id));
    console.log(`[${job}] ok — ${items} items`);
  } catch (err) {
    await db
      .update(tables.jobRuns)
      .set({
        status: "error",
        finishedAt: new Date().toISOString(),
        error: String(err),
      })
      .where(eq(tables.jobRuns.id, row.id));
    console.error(`[${job}] FAILED:`, err);
    process.exitCode = 1;
    throw err;
  }
}

/* ------------------------- TCGCSV response types ------------------------- */

export interface TcgGroup {
  groupId: number;
  name: string;
  abbreviation: string | null;
  isSupplemental: boolean;
  publishedOn: string | null;
  modifiedOn: string;
}

export interface TcgExtended {
  name: string;
  displayName: string;
  value: string;
}

export interface TcgProduct {
  productId: number;
  name: string;
  cleanName: string | null;
  imageUrl: string | null;
  groupId: number;
  url: string;
  extendedData: TcgExtended[] | null;
}

export interface TcgPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  subTypeName: string;
}

export interface TcgResponse<T> {
  totalItems?: number;
  success: boolean;
  results: T[];
}

export function ext(p: TcgProduct, name: string): string | null {
  return p.extendedData?.find((e) => e.name === name)?.value ?? null;
}

export function isCard(p: TcgProduct): boolean {
  return ext(p, "Number") !== null;
}
