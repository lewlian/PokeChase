import { describe, it, expect } from "vitest";
import { slugify, money, pct, sortNumber, shortDate } from "@/lib/format";

describe("slugify", () => {
  it("handles prefixes and punctuation", () => {
    expect(slugify("SV08: Surging Sparks")).toBe("sv08-surging-sparks");
    expect(slugify("Champion's Path")).toBe("champions-path");
    expect(slugify("Scarlet & Violet Base Set")).toBe("scarlet-and-violet-base-set");
    expect(slugify("HS—Unleashed")).toBe("hs-unleashed");
  });
});

describe("money / pct", () => {
  it("formats and handles nulls", () => {
    expect(money(1234.5)).toBe("$1,234.50");
    expect(money(null)).toBe("—");
    expect(pct(12.34)).toBe("+12.3%");
    expect(pct(-5)).toBe("-5.0%");
    expect(pct(null)).toBe("—");
  });
});

describe("sortNumber", () => {
  it("extracts numerics", () => {
    expect(sortNumber("199/165")).toBe(199);
    expect(sortNumber("TG12/TG30")).toBe(12);
    expect(sortNumber(null)).toBeNull();
  });
});

describe("shortDate", () => {
  it("formats ISO dates in UTC", () => {
    expect(shortDate("2026-07-17")).toBe("Jul 17, 2026");
    expect(shortDate(null)).toBe("—");
  });
});
