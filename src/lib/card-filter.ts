import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { parseSearchQuery } from "@/lib/search-query";

/**
 * Shared card-matching SQL for free-text queries — used by both the search
 * page and the market screener so "chansey", "113/165", and "chansey 113"
 * behave identically everywhere. Conditions are written against the `cards`
 * alias `c`.
 */

const clean = (s: string) => s.replace(/[%_]/g, " ").trim();

function numberedWhere(parsed: ReturnType<typeof parseSearchQuery>): SQL {
  const numerator = clean(parsed.numerator!);
  // Letter-prefixed numbers (TG12, GG05) match by prefix only — their numeric
  // part would collide with ordinary card numbers.
  const numberCond = /[a-z]/i.test(numerator)
    ? sql`c.number like ${numerator + "%"}`
    : sql`(c.sort_number = ${parsed.numeratorValue} or c.number like ${numerator + "/%"})`;
  const withDenom = parsed.denominator
    ? sql`${numberCond} and c.number like ${"%/" + clean(parsed.denominator)}`
    : numberCond;
  return parsed.name ? sql`c.name like ${`%${clean(parsed.name)}%`} and ${withDenom}` : withDenom;
}

/** Condition for a query, or null when the query is empty. `loose` also
 *  treats unmarked letters+digits tokens (tg12) as card numbers. */
export function cardMatchWhere(q: string, loose = false): SQL | null {
  const trimmed = clean(q);
  if (!trimmed) return null;
  const parsed = parseSearchQuery(q, loose);
  if (parsed.numerator) return numberedWhere(parsed);
  return sql`c.name like ${`%${trimmed}%`}`;
}

/** True when a query could still match as a card number under loose parsing —
 *  callers use this to retry after an empty name search. */
export function hasLooseNumberFallback(q: string): boolean {
  return !parseSearchQuery(q).numerator && Boolean(parseSearchQuery(q, true).numerator);
}
