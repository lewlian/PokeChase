/**
 * Era taxonomy + deterministic mapping from a TCGplayer group (set) to an era.
 * Strategy: explicit name rules first, then abbreviation/name prefixes,
 * then release-year fallback. Unit-tested in tests/eras.test.ts.
 */

export interface EraDef {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  sortOrder: number;
  accent: string;
}

export const ERAS: EraDef[] = [
  { id: "original", name: "Original Series", startYear: 1999, endYear: 2000, sortOrder: 1, accent: "#D5333F" },
  { id: "neo", name: "Neo Series", startYear: 2000, endYear: 2002, sortOrder: 2, accent: "#8B5CF6" },
  { id: "e-card", name: "e-Card Series", startYear: 2002, endYear: 2003, sortOrder: 3, accent: "#0EA5E9" },
  { id: "ex", name: "EX Series", startYear: 2003, endYear: 2007, sortOrder: 4, accent: "#F59E0B" },
  { id: "diamond-pearl", name: "Diamond & Pearl", startYear: 2007, endYear: 2009, sortOrder: 5, accent: "#60A5FA" },
  { id: "platinum", name: "Platinum", startYear: 2009, endYear: 2010, sortOrder: 6, accent: "#94A3B8" },
  { id: "hgss", name: "HeartGold & SoulSilver", startYear: 2010, endYear: 2011, sortOrder: 7, accent: "#EAB308" },
  { id: "black-white", name: "Black & White", startYear: 2011, endYear: 2013, sortOrder: 8, accent: "#334155" },
  { id: "xy", name: "XY", startYear: 2013, endYear: 2017, sortOrder: 9, accent: "#EF4444" },
  { id: "sun-moon", name: "Sun & Moon", startYear: 2017, endYear: 2019, sortOrder: 10, accent: "#F97316" },
  { id: "sword-shield", name: "Sword & Shield", startYear: 2020, endYear: 2023, sortOrder: 11, accent: "#3B82F6" },
  { id: "scarlet-violet", name: "Scarlet & Violet", startYear: 2023, endYear: 2025, sortOrder: 12, accent: "#DC2626" },
  { id: "mega-evolution", name: "Mega Evolution", startYear: 2025, endYear: null, sortOrder: 13, accent: "#7C3AED" },
  { id: "other", name: "Promos & Other", startYear: 1999, endYear: null, sortOrder: 14, accent: "#64748B" },
];

interface GroupLike {
  name: string;
  abbreviation?: string | null;
  publishedOn?: string | null; // ISO date
}

/** Ordered [regex-on-name, eraId] rules. First match wins. */
const NAME_RULES: Array<[RegExp, string]> = [
  // Modern prefixed names: "ME05: Pitch Black", "SV08: Surging Sparks", "SWSH12: ..."
  [/^ME\d*\s*:|^ME:\s/i, "mega-evolution"],
  // Japanese Mega-era sets: "M5: Abyss Eye", "M6: Storm Emeralda", "M2a: …",
  // plus lettered starter decks "MEE: Starter Set ex Eevee ex" / MEM / MEZ
  [/^M\d+[a-z]?\s*:/i, "mega-evolution"],
  [/^ME[A-Z]\s*:/, "mega-evolution"],
  [/^M-P\b/i, "mega-evolution"],
  [/^SV\d*[a-z]?\s*:|^SV:\s|^SV-P\b/i, "scarlet-violet"],
  [/^SWSH\d*\s*:|^SWSH:\s/i, "sword-shield"],
  // Japanese Sword & Shield sets: "S12a: VSTAR Universe", "S4a: Shiny Star V",
  // "S-P Promotional" (must come after SM/SV rules; ^S\d can't match those)
  [/^S\d+[a-z]?\s*:|^S-P\b/i, "sword-shield"],
  [/^SM\s*(\d+|-)?[a-z+]?\s*:|^SM:\s|^SM-P\b/i, "sun-moon"],

  // Original series
  [/^base set(\s*2)?$|^jungle$|^fossil$|^team rocket$|^gym (heroes|challenge)$/i, "original"],
  [/wizards.*promo|^base set \(shadowless\)/i, "original"],
  [/southern islands/i, "original"],
  // Neo
  [/^neo (genesis|discovery|revelation|destiny)$|^legendary collection$/i, "neo"],
  // e-Card
  [/^expedition$|^aquapolis$|^skyridge$|best of game/i, "e-card"],
  // EX era ("EX Ruby and Sapphire" ... "EX Power Keepers")
  [/^ex[ :]/i, "ex"],
  [/nintendo.*promo|^pop series/i, "ex"],
  // DP / Platinum / HGSS
  [/^diamond and pearl|^dp[ :]/i, "diamond-pearl"],
  [/^platinum/i, "platinum"],
  [/^heartgold soulsilver|^hgss|^hs—|^call of legends$/i, "hgss"],
  // BW / XY (JP sets use bare numbered prefixes: "BW5: Dragon Blade", "XY11: …")
  [/^black and white|^bw[\d :]/i, "black-white"],
  [/^xy/i, "xy"],
  [/^(generations|double crisis)$/i, "xy"],
  // SM extras without prefix
  [/^(shining legends|hidden fates|dragon majesty|detective pikachu)$/i, "sun-moon"],
  [/^sun and moon/i, "sun-moon"],
  // SWSH extras
  [/^(champion's path|shining fates|celebrations|pokemon go|crown zenith)$/i, "sword-shield"],
  [/^sword and shield/i, "sword-shield"],
  // SV extras
  [/^(scarlet and violet|paldean fates|pokemon card 151)/i, "scarlet-violet"],
  // Japanese vintage sets that TCGplayer catalogs with a modern entry date —
  // name rules must catch them before the year fallback misfiles them
  [/^expansion pack|vending machine|^pokemon (jungle|fossil)$|quick starter|^rocket gang|^gym (booster|expansion)/i, "original"],
  [/^web$|^vs\b|^e-card|^the town on no map|^wind from the sea|^split earth|^mysterious mountains/i, "e-card"],
  // Japanese era-prefixed promo sets stay with their era
  [/^dpt?-p\b/i, "diamond-pearl"],
  [/^bw-p\b/i, "black-white"],
  [/^xy-p\b/i, "xy"],
  // Catch-all promo/misc buckets → other (before year fallback so
  // "McDonald's Collection 2022" etc. lands in Other, matching hobby convention;
  // also catches JP vintage promo/event sets that TCGplayer catalogs with a
  // modern entry date — CoroCoro, Battle Road, contest cards, …)
  [/mcdonald|trick or trade|black star promo|^promo|promotional card|miscellaneous|jumbo|world championship|trainer kit|league|deck exclusives|alternate art promos|world hobby fair|fan club|shikishi|battle road|champion road|corocoro|design contest|photo contest|competition|master battle set|how i became|^unnumbered/i, "other"],
];

function yearOf(g: GroupLike): number | null {
  if (!g.publishedOn) return null;
  const y = Number(g.publishedOn.slice(0, 4));
  // 1996-1997 covers the Japanese originals (Expansion Pack, Jungle, Fossil)
  return Number.isFinite(y) && y >= 1996 ? y : null;
}

/** Release-year fallback (main line eras by year). */
const YEAR_FALLBACK: Array<[number, number, string]> = [
  [1996, 1999, "original"],
  [2000, 2001, "neo"],
  [2002, 2002, "e-card"],
  [2003, 2006, "ex"],
  [2007, 2008, "diamond-pearl"],
  [2009, 2009, "platinum"],
  [2010, 2010, "hgss"],
  [2011, 2013, "black-white"],
  [2014, 2016, "xy"],
  [2017, 2019, "sun-moon"],
  [2020, 2022, "sword-shield"],
  [2023, 2025, "scarlet-violet"],
  [2026, 9999, "mega-evolution"],
];

export function eraForGroup(g: GroupLike): string {
  for (const [re, era] of NAME_RULES) {
    if (re.test(g.name)) return era;
  }
  const y = yearOf(g);
  if (y !== null) {
    for (const [from, to, era] of YEAR_FALLBACK) {
      if (y >= from && y <= to) return era;
    }
  }
  return "other";
}
