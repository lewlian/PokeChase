/** Rarity ordering for sort controls. TCGplayer rarity strings are era-mixed
 *  free text, so sorting alphabetically scatters the ladder — rank known
 *  names low→high and park unknowns between Rare and the premium tiers. */

const RANKS: Record<string, number> = {
  common: 0,
  uncommon: 10,
  promo: 15,
  rare: 20,
  "holo rare": 30,
  "classic collection": 32,
  "rare ace": 34,
  "ace spec rare": 34,
  "radiant rare": 36,
  "amazing rare": 36,
  "double rare": 40,
  "prism rare": 40,
  "rare break": 42,
  "holo rare v": 44,
  "holo rare vmax": 46,
  "holo rare vstar": 46,
  "unconfirmed": 48,
  "shiny rare": 50,
  "shiny holo rare": 50,
  "art rare": 55,
  "illustration rare": 55,
  "super rare": 60,
  "ultra rare": 60,
  "shiny ultra rare": 62,
  "mega attack rare": 64,
  "special art rare": 70,
  "special illustration rare": 70,
  "secret rare": 75,
  "mega ultra rare": 76,
  "hyper rare": 80,
  "mega hyper rare": 82,
};

const UNKNOWN_RANK = 49;

export function rarityRank(rarity: string | null | undefined): number {
  if (!rarity) return -1; // unspecified sorts below Common
  return RANKS[rarity.toLowerCase()] ?? UNKNOWN_RANK;
}

/** Collector shorthand for rarity tags (C / UC / IR / SAR …), keyed on the
 *  lowercased TCGplayer string. Covers every rarity present in the catalog;
 *  unknown future strings fall back to word initials. */
const ABBREV: Record<string, string> = {
  common: "C",
  "common holo": "CH",
  uncommon: "UC",
  rare: "R",
  promo: "PROMO",
  "holo rare": "H",
  "double rare": "RR",
  "triple rare": "RRR",
  "ultra rare": "UR",
  "super rare": "SR",
  "super rare holo": "SR",
  "secret rare": "SEC",
  "hyper rare": "HR",
  "rainbow rare": "RBW",
  "illustration rare": "IR",
  "special illustration rare": "SIR",
  "art rare": "AR",
  "special art rare": "SAR",
  "character rare": "CHR",
  "character super rare": "CSR",
  "amazing rare": "AMZ",
  "radiant rare": "RAD",
  kagayaku: "K",
  "prism rare": "PS",
  "rare break": "BRK",
  "rare holo lv.x": "LV.X",
  "rare holo legend": "LEG",
  "rare ace": "ACE",
  "ace rare": "ACE",
  "ace spec rare": "ACE",
  "shiny rare": "S",
  "shiny holo rare": "S",
  shining: "S",
  "shiny ultra rare": "SSR",
  "shiny secret rare": "SSR",
  "black white rare": "BWR",
  "futuristic rare": "FR",
  "mega attack rare": "MAR",
  "mega ultra rare": "MUR",
  "mega hyper rare": "MHR",
  "classic collection": "CC",
  "trainer rare": "TR",
  "ultra-rare common": "UR·C",
  "ultra-rare uncommon": "UR·UC",
  "holo rare v": "V",
  "holo rare vmax": "VMAX",
  "holo rare vstar": "VSTAR",
};

/** Rarities that carry no information — render no tag at all. */
const NO_TAG = new Set(["none", "unconfirmed"]);

export function rarityAbbrev(rarity: string | null | undefined): string | null {
  if (!rarity) return null;
  const key = rarity.toLowerCase();
  if (NO_TAG.has(key)) return null;
  const known = ABBREV[key];
  if (known) return known;
  // Fallback: initials of the words ("Weird New Rare" → "WNR"), capped at 4.
  const initials = key
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 4) || null;
}

/** Premium tiers (IR/AR and above) get the gold tag treatment. */
export function isPremiumRarity(rarity: string | null | undefined): boolean {
  return rarityRank(rarity) >= 55;
}
