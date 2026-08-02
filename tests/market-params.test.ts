import { describe, expect, it } from "vitest";
import {
  parseScreenerParams,
  screenerQuery,
  sortSetRows,
} from "@/lib/market-params";

describe("parseScreenerParams", () => {
  it("applies defaults on empty input (U16)", () => {
    expect(parseScreenerParams({})).toEqual({
      sort: "price",
      dir: "desc",
      page: 1,
      minPrice: 1,
      eraId: null,
      language: null,
    });
  });

  it("accepts each whitelisted sort key (U15)", () => {
    for (const sort of ["price", "d7", "d30", "name"] as const) {
      expect(parseScreenerParams({ sort }).sort).toBe(sort);
    }
  });

  it("falls back to defaults on unknown sort and dir (U16, U17)", () => {
    const p = parseScreenerParams({ sort: "market; drop table cards", dir: "sideways" });
    expect(p.sort).toBe("price");
    expect(p.dir).toBe("desc");
  });

  it("name sort defaults to ascending", () => {
    expect(parseScreenerParams({ sort: "name" }).dir).toBe("asc");
  });

  it("clamps page and minPrice (U18)", () => {
    expect(parseScreenerParams({ page: "0" }).page).toBe(1);
    expect(parseScreenerParams({ page: "-3" }).page).toBe(1);
    expect(parseScreenerParams({ page: "2.5" }).page).toBe(1);
    expect(parseScreenerParams({ page: "12" }).page).toBe(12);
    expect(parseScreenerParams({ min: "-5" }).minPrice).toBe(1);
    expect(parseScreenerParams({ min: "abc" }).minPrice).toBe(1);
    expect(parseScreenerParams({ min: "20" }).minPrice).toBe(20);
  });

  it("rejects injection-shaped era ids and unknown languages (U19)", () => {
    expect(parseScreenerParams({ era: "x'; drop table sets;--" }).eraId).toBeNull();
    expect(parseScreenerParams({ era: "scarlet-violet" }).eraId).toBe("scarlet-violet");
    expect(parseScreenerParams({ lang: "fr" }).language).toBeNull();
    expect(parseScreenerParams({ lang: "jp" }).language).toBe("jp");
  });
});

describe("screenerQuery", () => {
  it("omits defaults and round-trips through parse", () => {
    expect(screenerQuery({ sort: "price", page: 1, minPrice: 1 })).toBe("");
    const q = screenerQuery({ sort: "d7", dir: "asc", page: 3, minPrice: 20, language: "jp" });
    const parsed = parseScreenerParams(Object.fromEntries(new URLSearchParams(q.slice(1))));
    expect(parsed.sort).toBe("d7");
    expect(parsed.dir).toBe("asc");
    expect(parsed.page).toBe(3);
    expect(parsed.minPrice).toBe(20);
    expect(parsed.language).toBe("jp");
  });
});

describe("sortSetRows", () => {
  const rows = [
    { name: "B", sortNumber: 2, number: "2", market: 5, d7Pct: -1, d30Pct: null },
    { name: "A", sortNumber: 1, number: "1", market: null, d7Pct: 3, d30Pct: 2 },
    { name: "C", sortNumber: null, number: null, market: 10, d7Pct: null, d30Pct: -4 },
  ];

  it("sorts by number with nulls last", () => {
    expect(sortSetRows(rows, "number").map((r) => r.name)).toEqual(["A", "B", "C"]);
  });

  it("sorts by price descending with nulls last", () => {
    expect(sortSetRows(rows, "price").map((r) => r.name)).toEqual(["C", "B", "A"]);
  });

  it("sorts by 7d/30d change descending with nulls last", () => {
    expect(sortSetRows(rows, "d7").map((r) => r.name)).toEqual(["A", "B", "C"]);
    expect(sortSetRows(rows, "d30").map((r) => r.name)).toEqual(["A", "C", "B"]);
  });

  it("does not mutate the input", () => {
    const before = rows.map((r) => r.name);
    sortSetRows(rows, "price");
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});
