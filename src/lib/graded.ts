/**
 * Graded-market support. Field→grade mapping follows the official
 * PriceCharting API docs for Cards (Key Descriptions):
 *   loose=Ungraded, cib=Grade 7, new=Grade 8, graded=Grade 9,
 *   box-only=Grade 9.5, manual-only=PSA 10, bgs-10, condition-17=CGC 10,
 *   condition-18=SGC 10. Prices arrive as integer pennies.
 * Unit-tested in tests/graded.test.ts.
 */

export const PC_GRADE_FIELDS: Array<[field: string, grade: string]> = [
  ["loose-price", "Ungraded"],
  ["cib-price", "Grade 7"],
  ["new-price", "Grade 8"],
  ["graded-price", "Grade 9"],
  ["box-only-price", "Grade 9.5"],
  ["manual-only-price", "PSA 10"],
  ["bgs-10-price", "BGS 10"],
  ["condition-17-price", "CGC 10"],
  ["condition-18-price", "SGC 10"],
];

/** Display order for the graded table (Raw row is rendered separately). */
export const GRADE_ORDER = PC_GRADE_FIELDS.map(([, g]) => g);

export interface GradedRow {
  grade: string;
  price: number; // USD
}

export function mapPcProduct(json: Record<string, unknown>): GradedRow[] {
  const out: GradedRow[] = [];
  for (const [field, grade] of PC_GRADE_FIELDS) {
    const pennies = json[field];
    if (typeof pennies === "number" && pennies > 0) {
      out.push({ grade, price: pennies / 100 });
    }
  }
  return out;
}

interface CardRef {
  name: string;
  number: string | null;
  setName: string;
}

/** Leading numeric part of a display number ("215/203" → "215"). */
export function numberPrefix(number: string | null | undefined): string | null {
  const m = number?.match(/(\d+)/);
  return m ? String(Number(m[1])) : null; // strip leading zeros: 095 → 95
}

/** Strip our set-name prefixes ("SWSH07: ", "SV: ") and parenthetical noise. */
function cleanSetName(setName: string): string {
  return setName.replace(/^[A-Z]+\d*\s*:\s*/i, "").replace(/\s*\(.*\)$/, "");
}

/** Search query for PriceCharting's best-match /api/product?q= lookup. */
export function pcQueryFor(card: CardRef): string {
  const num = numberPrefix(card.number);
  const name = card.name.replace(/\s*\(.*\)$/, ""); // "(Alternate Art Secret)" hurts matching
  return ["pokemon", cleanSetName(card.setName), name, num ? `#${num}` : ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-match search can return the wrong card — accept only when the provider's
 * product name carries our card number (their convention: "Name #215") or, for
 * numberless promos, starts with our card's name.
 */
export function plausibleMatch(pcProductName: string, card: CardRef): boolean {
  const num = numberPrefix(card.number);
  if (num) return new RegExp(`#0*${num}(?!\\d)`).test(pcProductName);
  const first = card.name.split(/[\s(]/)[0]?.toLowerCase() ?? "";
  return pcProductName.toLowerCase().startsWith(first);
}

/* --------------- zero-dependency outbound comp links --------------------- */

export function ebaySoldUrl(card: CardRef, grade = "PSA 10"): string {
  const q = ["pokemon", card.name.replace(/\s*\(.*\)$/, ""), card.number ?? "", grade]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Complete=1&LH_Sold=1`;
}

export function pricechartingSearchUrl(card: CardRef): string {
  const q = pcQueryFor(card);
  return `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(q)}`;
}
