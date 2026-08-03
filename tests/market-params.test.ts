import { describe, expect, it } from "vitest";
import {
  filterCardRows,
  parseScreenerParams,
  parseSetPageParams,
  screenerQuery,
  sortCardRows,
} from "@/lib/market-params";
import { rarityRank } from "@/lib/rarity";
import { setCardStats } from "@/lib/set-stats";

describe("parseScreenerParams", () => {
  it("applies defaults on empty input (U16)", () => {
    expect(parseScreenerParams({})).toEqual({
      sort: "price",
      dir: "desc",
      page: 1,
      eraIds: [],
      language: null,
      q: "",
    });
  });

  it("trims and caps the free-text filter (U23)", () => {
    expect(parseScreenerParams({ q: "  charizard  " }).q).toBe("charizard");
    expect(parseScreenerParams({ q: "x".repeat(200) }).q).toHaveLength(60);
    expect(parseScreenerParams({ q: "113/165" }).q).toBe("113/165");
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

  it("clamps page (U18)", () => {
    expect(parseScreenerParams({ page: "0" }).page).toBe(1);
    expect(parseScreenerParams({ page: "-3" }).page).toBe(1);
    expect(parseScreenerParams({ page: "2.5" }).page).toBe(1);
    expect(parseScreenerParams({ page: "12" }).page).toBe(12);
  });

  it("parses era multi-select, dropping injection-shaped ids (U19)", () => {
    expect(parseScreenerParams({ era: "x'; drop table sets;--" }).eraIds).toEqual([]);
    expect(parseScreenerParams({ era: "scarlet-violet" }).eraIds).toEqual(["scarlet-violet"]);
    expect(parseScreenerParams({ era: "neo,ex,neo" }).eraIds).toEqual(["neo", "ex"]); // dedupes
    expect(parseScreenerParams({ era: "neo,bad id!,ex" }).eraIds).toEqual(["neo", "ex"]);
    expect(parseScreenerParams({ lang: "fr" }).language).toBeNull();
    expect(parseScreenerParams({ lang: "jp" }).language).toBe("jp");
  });
});

describe("screenerQuery", () => {
  it("carries the text filter and drops it when empty", () => {
    expect(screenerQuery({ q: "charizard" })).toBe("?q=charizard");
    expect(screenerQuery({ q: "" })).toBe("");
  });

  it("omits defaults and round-trips through parse", () => {
    expect(screenerQuery({ sort: "price", page: 1, eraIds: [] })).toBe("");
    const q = screenerQuery({
      sort: "d7",
      dir: "asc",
      page: 3,
      eraIds: ["neo", "ex"],
      language: "jp",
    });
    const parsed = parseScreenerParams(Object.fromEntries(new URLSearchParams(q.slice(1))));
    expect(parsed.sort).toBe("d7");
    expect(parsed.dir).toBe("asc");
    expect(parsed.page).toBe(3);
    expect(parsed.eraIds).toEqual(["neo", "ex"]);
    expect(parsed.language).toBe("jp");
  });
});

describe("sortCardRows", () => {
  const rows = [
    { name: "B", sortNumber: 2, number: "2/10", rarity: "Ultra Rare", market: 5, d7Pct: -1, d30Pct: null },
    { name: "A", sortNumber: 1, number: "1/10", rarity: "Common", market: null, d7Pct: 3, d30Pct: 2 },
    { name: "C", sortNumber: null, number: null, rarity: null, market: 10, d7Pct: null, d30Pct: -4 },
  ];

  it("sorts by number asc with nulls last", () => {
    expect(sortCardRows(rows, "number", "asc").map((r) => r.name)).toEqual(["A", "B", "C"]);
  });

  it("sorts by price in both directions, nulls always last", () => {
    expect(sortCardRows(rows, "price", "desc").map((r) => r.name)).toEqual(["C", "B", "A"]);
    expect(sortCardRows(rows, "price", "asc").map((r) => r.name)).toEqual(["B", "C", "A"]);
  });

  it("sorts by rarity using the ladder, not the alphabet", () => {
    // desc: Ultra Rare (60) > Common (0) > unspecified (-1)
    expect(sortCardRows(rows, "rarity", "desc").map((r) => r.name)).toEqual(["B", "A", "C"]);
    // "Illustration Rare" must outrank "Holo Rare" despite alphabetical order
    expect(rarityRank("Illustration Rare")).toBeGreaterThan(rarityRank("Holo Rare"));
    expect(rarityRank("Special Art Rare")).toBe(rarityRank("Special Illustration Rare"));
  });

  it("sorts by 7d/30d change with nulls last", () => {
    expect(sortCardRows(rows, "d7", "desc").map((r) => r.name)).toEqual(["A", "B", "C"]);
    expect(sortCardRows(rows, "d30", "asc").map((r) => r.name)).toEqual(["C", "A", "B"]);
  });

  it("does not mutate the input", () => {
    const before = rows.map((r) => r.name);
    sortCardRows(rows, "price", "desc");
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});

describe("parseSetPageParams", () => {
  it("defaults to the Cards tab sorted by price desc, grid view", () => {
    expect(parseSetPageParams({})).toEqual({
      tab: "cards",
      sort: "price",
      dir: "desc",
      view: "grid",
      q: "",
    });
  });

  it("name/number sorts default ascending, others descending", () => {
    expect(parseSetPageParams({ sort: "name" }).dir).toBe("asc");
    expect(parseSetPageParams({ sort: "number" }).dir).toBe("asc");
    expect(parseSetPageParams({ sort: "rarity" }).dir).toBe("desc");
    expect(parseSetPageParams({ sort: "price", dir: "asc" }).dir).toBe("asc");
  });

  it("whitelists tab/sort/view", () => {
    expect(parseSetPageParams({ tab: "chase" }).tab).toBe("cards"); // old links land on Cards
    expect(parseSetPageParams({ sort: "evil" }).sort).toBe("price");
    expect(parseSetPageParams({ view: "list" }).view).toBe("grid");
  });
});

describe("filterCardRows", () => {
  const rows = [
    { name: "Pikachu", number: "025/100", sortNumber: 25 },
    { name: "Pikachu ex", number: "112/100", sortNumber: 112 },
    { name: "Raichu", number: "026/100", sortNumber: 26 },
  ];

  it("matches by name substring, case-insensitive", () => {
    expect(filterCardRows(rows, "pika").map((r) => r.name)).toEqual(["Pikachu", "Pikachu ex"]);
  });

  it("matches by number, zero-padded or not", () => {
    expect(filterCardRows(rows, "25").map((r) => r.name)).toEqual(["Pikachu"]);
    expect(filterCardRows(rows, "112/100").map((r) => r.name)).toEqual(["Pikachu ex"]);
  });

  it("combines name and number", () => {
    expect(filterCardRows(rows, "pikachu 112").map((r) => r.name)).toEqual(["Pikachu ex"]);
    expect(filterCardRows(rows, "raichu 112")).toEqual([]);
  });

  it("empty query returns everything", () => {
    expect(filterCardRows(rows, "  ")).toHaveLength(3);
  });
});

describe("setCardStats", () => {
  const rows = [
    { name: "A", number: "001/100", sortNumber: 1, market: 1 },
    { name: "B", number: "002/100", sortNumber: 2, market: null },
    { name: "Secret", number: "101/100", sortNumber: 101, market: 50.5 },
    { name: "Big", number: "099/100", sortNumber: 99, market: 200 },
  ];

  it("splits base vs secret via the printed denominator", () => {
    const s = setCardStats(rows);
    expect(s.printedTotal).toBe(100);
    expect(s.baseCount).toBe(3);
    expect(s.secretCount).toBe(1);
  });

  it("finds the top card and sums the full set value", () => {
    const s = setCardStats(rows);
    expect(s.topCard).toEqual({ name: "Big", market: 200 });
    expect(s.totalValue).toBe(251.5);
  });

  it("handles sets with no slash numbering (promos)", () => {
    const s = setCardStats([{ name: "P", number: "SWSH001", sortNumber: 1, market: 3 }]);
    expect(s.printedTotal).toBeNull();
    expect(s.secretCount).toBe(0);
    expect(s.baseCount).toBe(1);
  });
});
