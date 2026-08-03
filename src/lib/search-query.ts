/** Query parsing for card search: lets users target a card number directly —
 *  "113/165", "chansey 113", "#4", "tg12/tg30" — alongside plain name search.
 *  Pure and unit-tested. */

export interface ParsedSearch {
  /** Name words with the number token removed (empty string = number-only). */
  name: string;
  /** Card-number numerator as printed, e.g. "113" or "TG12". Null = no number. */
  numerator: string | null;
  /** Numeric part of the numerator ("TG12" → 12) for sort_number matching. */
  numeratorValue: number | null;
  /** Denominator after "/", e.g. "165" or "TG30". Null when absent. */
  denominator: string | null;
}

// last token shaped like a card number: optional #, optional letter prefix,
// digits, optional /denominator ("113", "#113", "113/165", "tg12/tg30")
const NUMBER_TOKEN = /^#?([A-Za-z]{0,4}\d{1,4})(?:\/([A-Za-z0-9]{1,6}))?$/;

export function parseSearchQuery(raw: string, loose = false): ParsedSearch {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const none: ParsedSearch = {
    name: raw.trim(),
    numerator: null,
    numeratorValue: null,
    denominator: null,
  };
  if (tokens.length === 0) return none;

  const last = tokens[tokens.length - 1];
  const m = last.match(NUMBER_TOKEN);
  if (!m) return none;
  const numerator = m[1];
  const digits = numerator.match(/\d+/);
  if (!digits) return none;
  // A bare word of letters+digits like "tg12" could also be a name (Porygon2)
  // — only treat it as a number when marked (#, /denominator, digits-only),
  // or in loose mode, which callers use as a zero-result fallback.
  const explicit = last.startsWith("#") || m[2] !== undefined || /^\d+$/.test(numerator);
  if (!explicit && !loose) return none;

  return {
    name: tokens.slice(0, -1).join(" "),
    numerator,
    numeratorValue: Number(digits[0]),
    denominator: m[2] ?? null,
  };
}
