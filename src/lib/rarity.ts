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
