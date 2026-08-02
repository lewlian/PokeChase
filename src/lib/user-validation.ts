/** Pure input validation for the /api/v1/me endpoints (unit-tested). The
 *  database constraints mirror these rules — validation here just produces
 *  friendlier 400s than a Postgres check violation. */

export const MAX_WATCHLIST_NAME = 40;
export const MAX_QUANTITY = 9999;

/** Trimmed name, or null when invalid. */
export function cleanWatchlistName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (name.length < 1 || name.length > MAX_WATCHLIST_NAME) return null;
  return name;
}

/** Positive integer product id, or null. */
export function cleanProductId(input: unknown): number | null {
  const n = typeof input === "string" ? Number(input) : input;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Variant name (defaults to "Normal"), or null when malformed. */
export function cleanSubType(input: unknown): string | null {
  if (input === undefined || input === null) return "Normal";
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (s.length < 1 || s.length > 40) return null;
  return s;
}

/** Quantity 0..9999 (0 = remove the holding), or null when invalid. */
export function cleanQuantity(input: unknown): number | null {
  const n = typeof input === "string" ? Number(input) : input;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_QUANTITY) return null;
  return n;
}
