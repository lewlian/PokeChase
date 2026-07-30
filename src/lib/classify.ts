import type { SealedType } from "@/db/schema";

/**
 * Classify a sealed TCGplayer product by name. Ordered rules — first match wins.
 * Unit-tested in tests/classify.test.ts.
 */
const RULES: Array<[RegExp, SealedType]> = [
  [/code card|playmat|deck box|card sleeves|sleeves \(|binder|portfolio|album|damage counter|coin|marker|pin\b|badge|figure|lot bundle|bulk/i, "accessory"],
  [/\bcase\b/i, "other"], // sealed cases (6x boxes etc.) — priced, but not a consumer unit
  [/booster (box|display)|display box|half booster box/i, "booster_box"],
  [/elite trainer box|elite trainer|etb/i, "etb"],
  [/booster bundle/i, "booster_bundle"],
  [/ultra.?premium collection|upc/i, "upc"],
  [/build (&|and) battle/i, "build_battle"],
  [/blister/i, "blister"],
  [/sleeved booster|booster pack|^.*\bpack\b(?!.*blister)/i, "loose_pack"],
  [/theme deck|starter deck|battle deck|league battle deck|v battle deck|ex battle deck|deck kit|starter set|battle academy/i, "deck"],
  [/\btins?\b|mini tin/i, "tin"],
  [/collection|premium|box set|pokemon center|special|treasure chest|poster|bundle/i, "collection_box"],
  [/\bbox\b/i, "collection_box"],
];

export function classifySealed(name: string): SealedType {
  for (const [re, type] of RULES) {
    if (re.test(name)) return type;
  }
  return "other";
}

export const SEALED_TYPE_LABEL: Record<SealedType, string> = {
  booster_box: "Booster Boxes",
  etb: "Elite Trainer Boxes",
  booster_bundle: "Booster Bundles",
  loose_pack: "Loose Packs",
  blister: "Blisters",
  collection_box: "Collections & Boxes",
  upc: "Ultra-Premium Collections",
  tin: "Tins",
  deck: "Decks & Starter Products",
  build_battle: "Build & Battle",
  accessory: "Accessories",
  other: "Other Products",
};

/** Display order for the sealed tab. */
export const SEALED_TYPE_ORDER: SealedType[] = [
  "booster_box",
  "etb",
  "upc",
  "booster_bundle",
  "collection_box",
  "blister",
  "loose_pack",
  "tin",
  "build_battle",
  "deck",
  "other",
  "accessory",
];

/** Packs contained per product type (typical modern counts, used for $/pack math). */
export function typicalPackCount(type: SealedType, name: string): number | null {
  const m = name.match(/(\d+)[ -]pack/i) ?? name.match(/\[set of (\d+)\]/i);
  if (m) return Number(m[1]);
  switch (type) {
    case "booster_box":
      return /half booster/i.test(name) ? 18 : 36;
    case "booster_bundle":
      return 6;
    case "loose_pack":
      return 1;
    case "blister":
      return /3[ -]pack|three/i.test(name) ? 3 : 1;
    default:
      return null;
  }
}
