import { describe, it, expect } from "vitest";
import { classifySealed, typicalPackCount } from "@/lib/classify";

describe("classifySealed", () => {
  const cases: Array<[string, string]> = [
    ["Pitch Black Booster Box", "booster_box"],
    ["Surging Sparks Booster Box [36 Packs]", "booster_box"],
    ["Prismatic Evolutions Elite Trainer Box", "etb"],
    ["Pitch Black Elite Trainer Box [Set of 2]", "etb"],
    ["Surging Sparks Booster Bundle [6 Packs]", "booster_bundle"],
    ["Pitch Black 3-Pack Blister [Binacle]", "blister"],
    ["Scarlet & Violet Single Pack Blister [Sprigatito]", "blister"],
    ["Pitch Black Booster Pack", "loose_pack"],
    ["Prismatic Evolutions Sleeved Booster Pack", "loose_pack"],
    ["Charizard ex Ultra-Premium Collection", "upc"],
    ["Pitch Black Build & Battle Box", "build_battle"],
    ["Mega Charizard X ex Premium Collection", "collection_box"],
    ["Paldean Fates Tin [Great Tusk ex]", "tin"],
    ["Mini Tin Display [Paldea Friends]", "tin"],
    ["Battle Academy 2024", "deck"],
    ["Koraidon ex League Battle Deck", "deck"],
    ["Pitch Black Code Card", "accessory"],
    ["Pitch Black Booster Box Case", "other"],
    ["Pitch Black Half Booster Boxes", "booster_box"],
    ["Pitch Black Sleeved Booster Case", "other"],
    ["Pitch Black Booster Pack Art Bundle [Set of 4]", "loose_pack"],
    ["Card Sleeves (65) [Pikachu]", "accessory"],
    ["9-Pocket Portfolio [Charizard]", "accessory"],
  ];

  it.each(cases)("%s → %s", (name, expected) => {
    expect(classifySealed(name)).toBe(expected);
  });
});

describe("typicalPackCount", () => {
  it("booster box = 36", () => {
    expect(typicalPackCount("booster_box", "X Booster Box")).toBe(36);
  });
  it("bundle = 6", () => {
    expect(typicalPackCount("booster_bundle", "X Booster Bundle")).toBe(6);
  });
  it("explicit pack count in name wins", () => {
    expect(typicalPackCount("blister", "X 3-Pack Blister [Y]")).toBe(3);
  });
  it("single blister = 1", () => {
    expect(typicalPackCount("blister", "Single Pack Blister")).toBe(1);
  });
  it("etb has no generic count", () => {
    expect(typicalPackCount("etb", "X Elite Trainer Box")).toBeNull();
  });
  it("half booster box = 18, set-of-N wins", () => {
    expect(typicalPackCount("booster_box", "X Half Booster Boxes")).toBe(18);
    expect(typicalPackCount("loose_pack", "X Booster Pack Art Bundle [Set of 4]")).toBe(4);
  });
});
