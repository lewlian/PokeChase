/** URL-param parsing for market views. Pure and whitelist-based — sort/dir
 *  values become keys into fixed SQL fragment maps, never interpolated text. */

export const SCREENER_SORTS = ["price", "d7", "d30", "name"] as const;
export type ScreenerSort = (typeof SCREENER_SORTS)[number];
export type SortDir = "asc" | "desc";

export const SCREENER_PAGE_SIZE = 50;
export const MAX_ERA_FILTERS = 20;

export interface ScreenerParams {
  sort: ScreenerSort;
  dir: SortDir;
  page: number;
  /** Selected era ids (checkbox multi-select). Empty = all eras. */
  eraIds: string[];
  language: "en" | "jp" | null;
  /** Free-text filter (name or card number). Empty string = no filter. */
  q: string;
}

export const MAX_QUERY_LEN = 60;

const ERA_ID_RE = /^[a-z0-9-]{1,40}$/;

export function parseScreenerParams(sp: Record<string, string | undefined>): ScreenerParams {
  const sort = (SCREENER_SORTS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as ScreenerSort)
    : "price";
  const dir: SortDir =
    sp.dir === "asc" || sp.dir === "desc" ? sp.dir : sort === "name" ? "asc" : "desc";
  const rawPage = Number(sp.page);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 9999) : 1;
  const eraIds = [
    ...new Set((sp.era ?? "").split(",").filter((e) => ERA_ID_RE.test(e))),
  ].slice(0, MAX_ERA_FILTERS);
  const language = sp.lang === "en" || sp.lang === "jp" ? sp.lang : null;
  const q = (sp.q ?? "").trim().slice(0, MAX_QUERY_LEN);
  return { sort, dir, page, eraIds, language, q };
}

/** Query string for a screener state, omitting defaults to keep URLs clean. */
export function screenerQuery(p: Partial<ScreenerParams>): string {
  const q = new URLSearchParams();
  if (p.sort && p.sort !== "price") q.set("sort", p.sort);
  if (p.dir && p.dir !== (p.sort === "name" ? "asc" : "desc")) q.set("dir", p.dir);
  if (p.page && p.page > 1) q.set("page", String(p.page));
  if (p.eraIds && p.eraIds.length > 0) q.set("era", p.eraIds.join(","));
  if (p.language) q.set("lang", p.language);
  if (p.q) q.set("q", p.q);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ------------------------- set-page card controls ------------------------- */

import { rarityRank } from "@/lib/rarity";
import { parseSearchQuery } from "@/lib/search-query";

export const SET_SORTS = ["number", "name", "rarity", "price", "d7", "d30"] as const;
export type SetSort = (typeof SET_SORTS)[number];

export interface SetPageParams {
  tab: "cards" | "sealed";
  sort: SetSort;
  dir: SortDir;
  view: "grid" | "table";
  q: string;
}

/** Defaults: Cards tab, priced high→low, grid view. */
export function parseSetPageParams(sp: Record<string, string | undefined>): SetPageParams {
  const tab = sp.tab === "sealed" ? "sealed" : "cards";
  const sort = (SET_SORTS as readonly string[]).includes(sp.sort ?? "")
    ? (sp.sort as SetSort)
    : "price";
  const defaultDir: SortDir = sort === "name" || sort === "number" ? "asc" : "desc";
  const dir: SortDir = sp.dir === "asc" || sp.dir === "desc" ? sp.dir : defaultDir;
  const view = sp.view === "table" ? "table" : "grid";
  const q = (sp.q ?? "").trim().slice(0, MAX_QUERY_LEN);
  return { tab, sort, dir, view, q };
}

export interface SortableCardRow {
  name: string;
  sortNumber: number | null;
  number: string | null;
  rarity: string | null;
  market: number | null;
  d7Pct: number | null;
  d30Pct: number | null;
}

/** Direction-aware sort for a set's card rows (≤ a few hundred — JS is fine).
 *  Unpriced/unknown values always sink to the bottom, whatever the direction. */
export function sortCardRows<T extends SortableCardRow>(
  rows: T[],
  sort: SetSort,
  dir: SortDir,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  const numeric = (a: number | null, b: number | null) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1; // nulls last regardless of direction
    if (b === null) return -1;
    return (a - b) * sign;
  };
  const cmp: Record<SetSort, (a: T, b: T) => number> = {
    number: (a, b) =>
      numeric(a.sortNumber, b.sortNumber) ||
      (a.number ?? "").localeCompare(b.number ?? "") * sign,
    name: (a, b) => a.name.localeCompare(b.name) * sign,
    rarity: (a, b) => numeric(rarityRank(a.rarity), rarityRank(b.rarity)) || a.name.localeCompare(b.name),
    price: (a, b) => numeric(a.market, b.market),
    d7: (a, b) => numeric(a.d7Pct, b.d7Pct),
    d30: (a, b) => numeric(a.d30Pct, b.d30Pct),
  };
  return [...rows].sort(cmp[sort]);
}

/** Name-or-number filter for a set's rows — same query grammar as site
 *  search ("pikachu", "113", "113/165", "pikachu 113"). */
export function filterCardRows<T extends { name: string; number: string | null; sortNumber: number | null }>(
  rows: T[],
  q: string,
): T[] {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return rows;
  const parsed = parseSearchQuery(trimmed);
  return rows.filter((r) => {
    if (parsed.numerator) {
      const numerator = parsed.numerator.toLowerCase();
      const number = (r.number ?? "").toLowerCase();
      const numberOk = /[a-z]/.test(numerator)
        ? number.startsWith(numerator)
        : r.sortNumber === parsed.numeratorValue || number.startsWith(`${numerator}/`);
      const denomOk = !parsed.denominator || number.endsWith(`/${parsed.denominator.toLowerCase()}`);
      const nameOk = !parsed.name || r.name.toLowerCase().includes(parsed.name);
      return numberOk && denomOk && nameOk;
    }
    return r.name.toLowerCase().includes(trimmed);
  });
}
