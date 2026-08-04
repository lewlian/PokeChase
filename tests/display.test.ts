import { describe, expect, it } from "vitest";
import { displayCardName } from "../src/lib/format";
import { rarityAbbrev, isPremiumRarity } from "../src/lib/rarity";

describe("displayCardName", () => {
  it("strips a plain trailing number segment", () => {
    expect(displayCardName("Machamp - 8/102")).toBe("Machamp");
    expect(displayCardName("Chansey - 113/165")).toBe("Chansey");
  });

  it("strips promo-style alphanumeric numbers", () => {
    expect(displayCardName("Arceus - DP50")).toBe("Arceus");
    expect(displayCardName("Pikachu - 227/S-P")).toBe("Pikachu");
    expect(displayCardName("Ampharos - BW67")).toBe("Ampharos");
  });

  it("keeps trailing qualifiers", () => {
    expect(displayCardName("Bagon - 057/113 (Delta Species)")).toBe("Bagon (Delta Species)");
    expect(displayCardName("Altaria - BW48 (Prerelease)")).toBe("Altaria (Prerelease)");
  });

  it("preserves suffixed names like LV.X", () => {
    expect(displayCardName("Arceus LV.X - DP53")).toBe("Arceus LV.X");
  });

  it("leaves non-number dash segments alone", () => {
    expect(displayCardName("Unown - E")).toBe("Unown - E");
    expect(displayCardName("Ho-Oh")).toBe("Ho-Oh");
  });

  it("leaves plain names alone", () => {
    expect(displayCardName("Alakazam")).toBe("Alakazam");
  });
});

describe("rarityAbbrev", () => {
  it("maps the collector shorthand", () => {
    expect(rarityAbbrev("Common")).toBe("C");
    expect(rarityAbbrev("Uncommon")).toBe("UC");
    expect(rarityAbbrev("Illustration Rare")).toBe("IR");
    expect(rarityAbbrev("Special Illustration Rare")).toBe("SIR");
    expect(rarityAbbrev("Art Rare")).toBe("AR");
    expect(rarityAbbrev("Special Art Rare")).toBe("SAR");
    expect(rarityAbbrev("Double Rare")).toBe("RR");
    expect(rarityAbbrev("Hyper Rare")).toBe("HR");
  });

  it("is case-insensitive", () => {
    expect(rarityAbbrev("special illustration rare")).toBe("SIR");
  });

  it("hides no-information rarities", () => {
    expect(rarityAbbrev("None")).toBeNull();
    expect(rarityAbbrev("Unconfirmed")).toBeNull();
    expect(rarityAbbrev(null)).toBeNull();
    expect(rarityAbbrev(undefined)).toBeNull();
  });

  it("falls back to word initials for unknown strings", () => {
    expect(rarityAbbrev("Weird New Rare")).toBe("WNR");
  });
});

describe("isPremiumRarity", () => {
  it("marks IR and above as premium", () => {
    expect(isPremiumRarity("Illustration Rare")).toBe(true);
    expect(isPremiumRarity("Special Art Rare")).toBe(true);
    expect(isPremiumRarity("Hyper Rare")).toBe(true);
    expect(isPremiumRarity("Common")).toBe(false);
    expect(isPremiumRarity("Rare")).toBe(false);
    expect(isPremiumRarity(null)).toBe(false);
  });
});
