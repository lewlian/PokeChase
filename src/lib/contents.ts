/**
 * Parse official TCGplayer product descriptions (stored from TCGCSV CardText)
 * into structured contents. Descriptions typically end with an
 * "…includes:" section of "•" bullets. Unit-tested in tests/contents.test.ts.
 */

function toLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== ".");
}

/** Structured contents items from the official "includes:" list, if present. */
export function parseOfficialContents(description: string | null | undefined): string[] {
  if (!description) return [];
  const lines = toLines(description);
  const items: string[] = [];
  let inList = false;
  for (const line of lines) {
    const isBullet = /^[•●▪–-]\s+/.test(line);
    if (isBullet) inList = true;
    if (!inList) {
      if (/includes:?\s*$/i.test(line)) inList = true;
      continue;
    }
    if (isBullet || /^\d+\s/.test(line) || /^(a|an)\s/i.test(line)) {
      const item = line
        .replace(/^[•●▪–-]\s+/, "")
        .replace(/\s+/g, " ")
        .replace(/[.\s]+$/, "")
        .trim();
      if (item.length >= 3) items.push(item);
    }
  }
  return items;
}

/** Marketing blurb before the includes-list, plain text, for product pages. */
export function descriptionIntro(description: string | null | undefined): string | null {
  if (!description) return null;
  const lines = toLines(description);
  const intro: string[] = [];
  for (const line of lines) {
    if (/includes:?\s*$/i.test(line) || /^[•●▪]\s+/.test(line)) break;
    intro.push(line);
  }
  const text = intro.join(" ").replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}
