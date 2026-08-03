import { beforeAll, describe, expect, it } from "vitest";
import { day, makeTestDb } from "./helpers/db";

/* Fixture (latest = day(0), d7 anchor = day(6), d30 anchor = day(29)):
 *   set 100 (era-a, en): card 1 (Normal + Holofoil), card 2 (Normal, no d7
 *     anchor row), card 3 (never priced)
 *   set 200 (era-b, jp): card 4 (flat week)
 *   set 300 (era-a, en): cards 1000-1059 at $2 (pagination filler)
 */
let qm: typeof import("@/lib/queries-market");

beforeAll(async () => {
  const f = await makeTestDb();
  f.seedEra("era-a");
  f.seedEra("era-b");
  f.seedSet(100, "era-a");
  f.seedSet(200, "era-b", { language: "jp" });
  f.seedSet(300, "era-a");
  f.seedCard(1, 100, { name: "Alpha", number: "1/100", sortNumber: 1 });
  f.seedCard(2, 100, { name: "Beta", number: "2/100", sortNumber: 2 });
  f.seedCard(3, 100, { name: "Gamma", number: "3/100", sortNumber: 3 });
  f.seedCard(4, 200, { name: "Delta" });

  // card 1: Holofoil is the best variant; changes must be holo-vs-holo
  f.seedSnap(1, "Holofoil", day(0), 50);
  f.seedSnap(1, "Holofoil", day(6), 40);
  f.seedSnap(1, "Holofoil", day(29), 25);
  f.seedSnap(1, "Holofoil", day(40), 99); // outside the 30d window
  f.seedSnap(1, "Normal", day(0), 5);
  f.seedSnap(1, "Normal", day(6), 4);
  // card 2: no snapshot at the d7 anchor; a null-market row that must be ignored
  f.seedSnap(2, "Normal", day(0), 10);
  f.seedSnap(2, "Normal", day(29), 8);
  f.seedSnap(2, "Normal", day(3), null);
  // card 4: unchanged week
  f.seedSnap(4, "Normal", day(0), 100);
  f.seedSnap(4, "Normal", day(6), 100);
  // pagination filler
  for (let i = 0; i < 60; i++) {
    f.seedCard(1000 + i, 300, { name: `Bulk ${String(i).padStart(2, "0")}` });
    f.seedSnap(1000 + i, "Normal", day(0), 2);
  }

  qm = await import("@/lib/queries-market");
});

describe("marketAnchors", () => {
  it("anchors on the latest date and the nearest dates ≤ 6/29 days back", () => {
    expect(qm.marketAnchors()).toEqual({ latest: day(0), d7: day(6), d30: day(29) });
  });
});

describe("cardsForSetWithChange", () => {
  it("picks the best variant and compares it to itself at the anchors (D1, D2)", () => {
    const rows = qm.cardsForSetWithChange(100);
    const alpha = rows.find((r) => r.productId === 1)!;
    expect(alpha.subType).toBe("Holofoil");
    expect(alpha.market).toBe(50);
    expect(alpha.d7Pct).toBeCloseTo(25); // (50-40)/40, NOT vs the Normal $4 row
    expect(alpha.d30Pct).toBeCloseTo(100); // (50-25)/25
  });

  it("yields null pct when the anchor row is missing (D2)", () => {
    const beta = qm.cardsForSetWithChange(100).find((r) => r.productId === 2)!;
    expect(beta.market).toBe(10);
    expect(beta.d7Pct).toBeNull();
    expect(beta.d30Pct).toBeCloseTo(25);
  });

  it("keeps never-priced cards with null market", () => {
    const gamma = qm.cardsForSetWithChange(100).find((r) => r.productId === 3)!;
    expect(gamma.market).toBeNull();
    expect(gamma.subType).toBeNull();
  });
});

describe("sparklinesFor (D3)", () => {
  it("returns the 30d best-variant series in date order", () => {
    const sparks = qm.sparklinesFor([{ productId: 1, subType: "Holofoil" }]);
    expect(sparks.get(qm.sparkKey(1, "Holofoil"))).toEqual([25, 40, 50]); // day(40)'s 99 excluded, Normal excluded
  });

  it("resolves the best variant when subType is omitted", () => {
    const sparks = qm.sparklinesFor([{ productId: 1 }]);
    expect(sparks.get(qm.sparkKey(1, "Holofoil"))).toEqual([25, 40, 50]);
  });

  it("keeps per-variant series distinct for the same product", () => {
    const sparks = qm.sparklinesFor([
      { productId: 1, subType: "Holofoil" },
      { productId: 1, subType: "Normal" },
    ]);
    expect(sparks.get(qm.sparkKey(1, "Holofoil"))).toEqual([25, 40, 50]);
    expect(sparks.get(qm.sparkKey(1, "Normal"))).toEqual([4, 5]);
  });
});

const base = {
  sort: "price",
  dir: "desc",
  page: 1,
  eraIds: [] as string[],
  language: null,
  q: "",
} as const;

describe("marketScreener", () => {
  it("sorts by price in both directions (D5)", () => {
    const desc = qm.marketScreener({ ...base, q: "a" }); // Alpha, Delta... narrow via names
    expect(desc.rows[0].market! >= (desc.rows.at(-1)!.market ?? 0)).toBe(true);
    const descTop = qm.marketScreener(base);
    expect(descTop.rows[0].productId).toBe(4); // $100 first
    expect(descTop.rows[1].productId).toBe(1); // $50 second
    const asc = qm.marketScreener({ ...base, dir: "asc" });
    expect(asc.rows[0].market).toBeLessThanOrEqual(asc.rows[1].market ?? Infinity);
  });

  it("sorts by 7d change with nulls last (D5)", () => {
    const { rows } = qm.marketScreener({ ...base, sort: "d7" });
    expect(rows[0].productId).toBe(1); // +25%
    expect(rows[1].productId).toBe(4); // 0%
    expect(rows[2].d7Pct).toBeNull(); // everything else has no anchor
    const asc = qm.marketScreener({ ...base, sort: "d7", dir: "asc" });
    expect(asc.rows[0].productId).toBe(4);
    expect(asc.rows[1].productId).toBe(1);
    expect(asc.rows[2].d7Pct).toBeNull();
  });

  it("paginates at 50 per page with a stable total (D6)", () => {
    const p1 = qm.marketScreener(base);
    expect(p1.total).toBe(63); // cards 1, 2, 4 + 60 bulk (card 3 unpriced)
    expect(p1.rows).toHaveLength(50);
    const p2 = qm.marketScreener({ ...base, page: 2 });
    expect(p2.total).toBe(63);
    expect(p2.rows).toHaveLength(13);
    const seen = new Set([...p1.rows, ...p2.rows].map((r) => r.productId));
    expect(seen.size).toBe(63);
  });

  it("filters by free-text name and card number (D11)", () => {
    const byName = qm.marketScreener({ ...base, q: "alpha" });
    expect(byName.total).toBe(1);
    expect(byName.rows[0].productId).toBe(1);

    const byNumber = qm.marketScreener({ ...base, q: "2/100" });
    expect(byNumber.rows.map((r) => r.productId)).toEqual([2]);

    // name + number together
    expect(qm.marketScreener({ ...base, q: "alpha 1" }).rows.map((r) => r.productId)).toEqual([1]);
    // no match
    expect(qm.marketScreener({ ...base, q: "zzzznope" }).total).toBe(0);
  });

  it("text filter composes with the other filters and paginates (D12)", () => {
    // 60 "Bulk NN" cards at $2 each, all in era-a
    const all = qm.marketScreener({ ...base, q: "bulk" });
    expect(all.total).toBe(60);
    expect(all.rows).toHaveLength(50);
    expect(qm.marketScreener({ ...base, q: "bulk", page: 2 }).rows).toHaveLength(10);
    // era filter still applies
    expect(qm.marketScreener({ ...base, q: "bulk", eraIds: ["era-b"] }).total).toBe(0);
  });

  it("filters by era (multi-select) and language (D7, D8)", () => {
    expect(qm.marketScreener({ ...base, eraIds: ["era-b"] }).total).toBe(1);
    expect(qm.marketScreener({ ...base, eraIds: ["era-a"] }).total).toBe(62);
    expect(qm.marketScreener({ ...base, eraIds: ["era-a", "era-b"] }).total).toBe(63);
    const jp = qm.marketScreener({ ...base, language: "jp" });
    expect(jp.total).toBe(1);
    expect(jp.rows[0].language).toBe("jp");
  });
});

describe("batchCards (D9)", () => {
  it("prices an explicit subType from that variant", () => {
    const [row] = qm.batchCards([{ productId: 1, subType: "Normal" }]);
    expect(row.subType).toBe("Normal");
    expect(row.market).toBe(5);
    expect(row.d7Pct).toBeCloseTo(25); // (5-4)/4
  });

  it("falls back to the best variant without a subType", () => {
    const [row] = qm.batchCards([{ productId: 1 }]);
    expect(row.subType).toBe("Holofoil");
    expect(row.market).toBe(50);
  });

  it("omits unknown productIds and survives >500-ref chunking", () => {
    const refs = [
      { productId: 1 },
      { productId: 2 },
      ...Array.from({ length: 501 }, (_, i) => ({ productId: 900_000 + i })),
    ];
    const rows = qm.batchCards(refs);
    expect(rows.map((r) => r.productId).sort()).toEqual([1, 2]);
  });

  it("includes set metadata", () => {
    const [row] = qm.batchCards([{ productId: 4 }]);
    expect(row.setSlug).toBe("set-200");
    expect(row.language).toBe("jp");
  });

  it("falls back to the best variant when the stored variant has no price", () => {
    // card 1 only prints Holofoil/Normal — a saved "Reverse Holofoil" (or the
    // 'Normal' default on a holo-only card) must still price and chart
    const [row] = qm.batchCards([{ productId: 1, subType: "Reverse Holofoil" }]);
    expect(row.subType).toBe("Holofoil");
    expect(row.market).toBe(50);
    expect(row.d7Pct).toBeCloseTo(25);
    const sparks = qm.sparklinesFor([{ productId: 1, subType: "Reverse Holofoil" }]);
    expect(sparks.get(qm.sparkKey(1, "Holofoil"))).toEqual([25, 40, 50]);
  });

  it("returns one row per variant when the same product is requested twice", () => {
    const rows = qm.batchCards([
      { productId: 1, subType: "Holofoil" },
      { productId: 1, subType: "Normal" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => [r.subType, r.market])).toEqual([
      ["Holofoil", 50],
      ["Normal", 5],
    ]);
  });
});

describe("priceSeriesFor (D10)", () => {
  it("returns per-variant series, respects since, and drops null markets", () => {
    const all = qm.priceSeriesFor([2]);
    expect(all).toEqual([
      { productId: 2, subType: "Normal", date: day(29), market: 8 },
      { productId: 2, subType: "Normal", date: day(0), market: 10 },
    ]);
    const recent = qm.priceSeriesFor([2], day(6));
    expect(recent).toEqual([{ productId: 2, subType: "Normal", date: day(0), market: 10 }]);
  });
});
