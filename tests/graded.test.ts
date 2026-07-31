import { describe, it, expect } from "vitest";
import {
  ebaySoldUrl,
  mapPcProduct,
  numberPrefix,
  pcQueryFor,
  plausibleMatch,
} from "@/lib/graded";

const moonbreon = {
  name: "Umbreon VMAX (Alternate Art Secret)",
  number: "215/203",
  setName: "SWSH07: Evolving Skies",
};

describe("mapPcProduct", () => {
  it("maps official card grade fields from pennies to dollars", () => {
    const rows = mapPcProduct({
      "loose-price": 240428,
      "graded-price": 310000,
      "manual-only-price": 550000,
      "bgs-10-price": 0, // zero = no data
      "condition-17-price": 480000,
      "console-name": "Pokemon Evolving Skies",
    });
    expect(rows).toEqual([
      { grade: "Ungraded", price: 2404.28 },
      { grade: "Grade 9", price: 3100 },
      { grade: "PSA 10", price: 5500 },
      { grade: "CGC 10", price: 4800 },
    ]);
  });
  it("empty object → no rows", () => {
    expect(mapPcProduct({})).toEqual([]);
  });
});

describe("numberPrefix", () => {
  it("extracts and normalizes", () => {
    expect(numberPrefix("215/203")).toBe("215");
    expect(numberPrefix("095/203")).toBe("95");
    expect(numberPrefix("TG12/TG30")).toBe("12");
    expect(numberPrefix(null)).toBeNull();
  });
});

describe("pcQueryFor", () => {
  it("builds a clean search query", () => {
    expect(pcQueryFor(moonbreon)).toBe("pokemon Evolving Skies Umbreon VMAX #215");
  });
});

describe("plausibleMatch", () => {
  it("accepts provider names carrying our number", () => {
    expect(plausibleMatch("Umbreon VMAX #215", moonbreon)).toBe(true);
    expect(plausibleMatch("Umbreon VMAX #21", moonbreon)).toBe(false);
    expect(plausibleMatch("Espeon VMAX #270", moonbreon)).toBe(false);
  });
  it("numberless promos match on leading name", () => {
    const promo = { name: "Mew (Delta Species)", number: null, setName: "Promos" };
    expect(plausibleMatch("Mew #101", promo)).toBe(true);
    expect(plausibleMatch("Pikachu #1", promo)).toBe(false);
  });
});

describe("ebaySoldUrl", () => {
  it("prefills a sold+completed search", () => {
    const url = ebaySoldUrl(moonbreon);
    expect(url).toContain("LH_Sold=1");
    expect(url).toContain("LH_Complete=1");
    expect(url).toContain(encodeURIComponent("Umbreon VMAX 215/203 PSA 10"));
  });
});
