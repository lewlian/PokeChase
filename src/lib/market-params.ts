/** URL-param parsing for market views. Pure and whitelist-based — sort/dir
 *  values become keys into fixed SQL fragment maps, never interpolated text. */

export const SCREENER_SORTS = ["price", "d7", "d30", "name"] as const;
export type ScreenerSort = (typeof SCREENER_SORTS)[number];
export type SortDir = "asc" | "desc";

export const SCREENER_PAGE_SIZE = 50;
export const MIN_PRICE_CHOICES = [1, 5, 20, 100] as const;

export interface ScreenerParams {
  sort: ScreenerSort;
  dir: SortDir;
  page: number;
  minPrice: number;
  eraId: string | null;
  language: "en" | "jp" | null;
}

const ERA_ID_RE = /^[a-z0-9-]{1,40}$/;

export function parseScreenerParams(sp: Record<string, string | undefined>): ScreenerParams {
  const sort = (SCREENER_SORTS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as ScreenerSort)
    : "price";
  const dir: SortDir =
    sp.dir === "asc" || sp.dir === "desc" ? sp.dir : sort === "name" ? "asc" : "desc";
  const rawPage = Number(sp.page);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 9999) : 1;
  const rawMin = Number(sp.min);
  const minPrice =
    Number.isFinite(rawMin) && rawMin >= 0 ? Math.min(rawMin, 1_000_000) : 1;
  const eraId = sp.era && ERA_ID_RE.test(sp.era) ? sp.era : null;
  const language = sp.lang === "en" || sp.lang === "jp" ? sp.lang : null;
  return { sort, dir, page, minPrice, eraId, language };
}

/** Query string for a screener state, omitting defaults to keep URLs clean. */
export function screenerQuery(p: Partial<ScreenerParams>): string {
  const q = new URLSearchParams();
  if (p.sort && p.sort !== "price") q.set("sort", p.sort);
  if (p.dir && p.dir !== (p.sort === "name" ? "asc" : "desc")) q.set("dir", p.dir);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  if (p.minPrice !== undefined && p.minPrice !== 1) q.set("min", String(p.minPrice));
  if (p.eraId) q.set("era", p.eraId);
  if (p.language) q.set("lang", p.language);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const SET_TABLE_SORTS = ["number", "price", "name", "d7", "d30"] as const;
export type SetTableSort = (typeof SET_TABLE_SORTS)[number];

/** In-place sort for a set's table rows (≤ a few hundred — JS sort is fine). */
export function sortSetRows<
  T extends {
    name: string;
    sortNumber: number | null;
    number: string | null;
    market: number | null;
    d7Pct: number | null;
    d30Pct: number | null;
  },
>(rows: T[], sort: SetTableSort): T[] {
  const nullsLast = (a: number | null, b: number | null, desc: boolean) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return desc ? b - a : a - b;
  };
  const cmp: Record<SetTableSort, (a: T, b: T) => number> = {
    number: (a, b) =>
      nullsLast(a.sortNumber, b.sortNumber, false) || (a.number ?? "").localeCompare(b.number ?? ""),
    price: (a, b) => nullsLast(a.market, b.market, true),
    name: (a, b) => a.name.localeCompare(b.name),
    d7: (a, b) => nullsLast(a.d7Pct, b.d7Pct, true),
    d30: (a, b) => nullsLast(a.d30Pct, b.d30Pct, true),
  };
  return [...rows].sort(cmp[sort]);
}
