import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/lib/search-query";

describe("parseSearchQuery", () => {
  it("passes plain name queries through untouched", () => {
    expect(parseSearchQuery("charizard")).toEqual({
      name: "charizard",
      numerator: null,
      numeratorValue: null,
      denominator: null,
    });
    expect(parseSearchQuery("umbreon vmax")).toMatchObject({ numerator: null });
  });

  it("parses a full number query like 113/165", () => {
    expect(parseSearchQuery("113/165")).toEqual({
      name: "",
      numerator: "113",
      numeratorValue: 113,
      denominator: "165",
    });
  });

  it("parses name + number combinations", () => {
    expect(parseSearchQuery("chansey 113/165")).toEqual({
      name: "chansey",
      numerator: "113",
      numeratorValue: 113,
      denominator: "165",
    });
    expect(parseSearchQuery("chansey 113")).toMatchObject({
      name: "chansey",
      numerator: "113",
      numeratorValue: 113,
      denominator: null,
    });
    expect(parseSearchQuery("charizard #4")).toMatchObject({
      name: "charizard",
      numerator: "4",
      numeratorValue: 4,
    });
  });

  it("handles letter-prefixed trainer-gallery numbers", () => {
    expect(parseSearchQuery("tg12/tg30")).toEqual({
      name: "",
      numerator: "TG12".toLowerCase() === "tg12" ? "tg12" : "TG12",
      numeratorValue: 12,
      denominator: "tg30",
    });
  });

  it("treats letters+digits without slash or # as a name, not a number", () => {
    expect(parseSearchQuery("mew2")).toMatchObject({ name: "mew2", numerator: null });
    expect(parseSearchQuery("porygon2")).toMatchObject({ numerator: null });
  });

  it("a bare numeric token is a number query", () => {
    expect(parseSearchQuery("151")).toMatchObject({
      name: "",
      numerator: "151",
      numeratorValue: 151,
    });
  });
});
