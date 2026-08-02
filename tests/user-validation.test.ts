import { describe, expect, it } from "vitest";
import {
  cleanProductId,
  cleanQuantity,
  cleanSubType,
  cleanWatchlistName,
} from "@/lib/user-validation";

describe("cleanWatchlistName (U20-U22)", () => {
  it("trims surrounding whitespace", () => {
    expect(cleanWatchlistName("  Grails  ")).toBe("Grails");
  });

  it("rejects empty, whitespace-only, over-long, and non-string input", () => {
    expect(cleanWatchlistName("")).toBeNull();
    expect(cleanWatchlistName("   ")).toBeNull();
    expect(cleanWatchlistName("x".repeat(41))).toBeNull();
    expect(cleanWatchlistName(42)).toBeNull();
    expect(cleanWatchlistName(undefined)).toBeNull();
  });

  it("allows unicode names", () => {
    expect(cleanWatchlistName("ポケカ 狙い ⭐")).toBe("ポケカ 狙い ⭐");
    expect(cleanWatchlistName("x".repeat(40))).toBe("x".repeat(40));
  });
});

describe("cleanProductId", () => {
  it("accepts positive integers (also as numeric strings)", () => {
    expect(cleanProductId(123)).toBe(123);
    expect(cleanProductId("123")).toBe(123);
  });

  it("rejects zero, negatives, floats, and junk", () => {
    expect(cleanProductId(0)).toBeNull();
    expect(cleanProductId(-5)).toBeNull();
    expect(cleanProductId(1.5)).toBeNull();
    expect(cleanProductId("abc")).toBeNull();
    expect(cleanProductId(null)).toBeNull();
  });
});

describe("cleanSubType", () => {
  it("defaults to Normal when omitted", () => {
    expect(cleanSubType(undefined)).toBe("Normal");
    expect(cleanSubType(null)).toBe("Normal");
  });

  it("trims valid variants and rejects malformed input", () => {
    expect(cleanSubType(" Holofoil ")).toBe("Holofoil");
    expect(cleanSubType("")).toBeNull();
    expect(cleanSubType("x".repeat(41))).toBeNull();
    expect(cleanSubType(7)).toBeNull();
  });
});

describe("cleanQuantity (R5 bounds)", () => {
  it("accepts 0 (remove) through 9999", () => {
    expect(cleanQuantity(0)).toBe(0);
    expect(cleanQuantity(3)).toBe(3);
    expect(cleanQuantity(9999)).toBe(9999);
    expect(cleanQuantity("4")).toBe(4);
  });

  it("rejects -1, 10000, floats, and junk", () => {
    expect(cleanQuantity(-1)).toBeNull();
    expect(cleanQuantity(10_000)).toBeNull();
    expect(cleanQuantity(2.5)).toBeNull();
    expect(cleanQuantity("nope")).toBeNull();
    expect(cleanQuantity(undefined)).toBeNull();
  });
});
