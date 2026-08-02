import { describe, expect, it } from "vitest";
import { changePct, portfolioSeries, type PricePoint } from "@/lib/portfolio";

const H = (productId: number, subType: string, quantity: number) => ({
  productId,
  subType,
  quantity,
});
const P = (productId: number, subType: string, date: string, market: number): PricePoint => ({
  productId,
  subType,
  date,
  market,
});

describe("portfolioSeries", () => {
  it("tracks a single holding across dates (U7)", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1)],
      [P(1, "Normal", "2026-07-01", 10), P(1, "Normal", "2026-07-02", 12)],
    );
    expect(series).toEqual([
      { date: "2026-07-01", value: 10 },
      { date: "2026-07-02", value: 12 },
    ]);
  });

  it("sums multiple holdings per date (U8)", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1), H(2, "Holofoil", 1)],
      [
        P(1, "Normal", "2026-07-01", 10),
        P(2, "Holofoil", "2026-07-01", 100),
        P(1, "Normal", "2026-07-02", 12),
        P(2, "Holofoil", "2026-07-02", 90),
      ],
    );
    expect(series.map((p) => p.value)).toEqual([110, 102]);
  });

  it("forward-fills gap dates from the last seen price (U9)", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1), H(2, "Normal", 1)],
      [
        P(1, "Normal", "2026-07-01", 10),
        P(2, "Normal", "2026-07-01", 5),
        // product 1 has no snapshot on the 2nd — carries $10 forward
        P(2, "Normal", "2026-07-02", 6),
      ],
    );
    expect(series.map((p) => p.value)).toEqual([15, 16]);
  });

  it("late-starting holdings contribute 0 until their first price (U10)", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1), H(2, "Normal", 1)],
      [
        P(1, "Normal", "2026-07-01", 10),
        P(1, "Normal", "2026-07-02", 10),
        P(2, "Normal", "2026-07-02", 50), // product 2 first priced on the 2nd
      ],
    );
    expect(series.map((p) => p.value)).toEqual([10, 60]);
  });

  it("multiplies by quantity (U11)", () => {
    const series = portfolioSeries([H(1, "Normal", 4)], [P(1, "Normal", "2026-07-01", 2.5)]);
    expect(series[0].value).toBe(10);
  });

  it("returns an empty series with no holdings (U13)", () => {
    expect(portfolioSeries([], [P(1, "Normal", "2026-07-01", 10)])).toEqual([]);
  });

  it("keeps two variants of the same product distinct (U14)", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 2), H(1, "Holofoil", 1)],
      [P(1, "Normal", "2026-07-01", 5), P(1, "Holofoil", "2026-07-01", 50)],
    );
    expect(series[0].value).toBe(60); // 2×5 + 1×50
  });

  it("ignores price data for unheld cards", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1)],
      [P(1, "Normal", "2026-07-01", 10), P(999, "Normal", "2026-07-01", 1000)],
    );
    expect(series[0].value).toBe(10);
  });

  it("handles unsorted price input", () => {
    const series = portfolioSeries(
      [H(1, "Normal", 1)],
      [P(1, "Normal", "2026-07-03", 30), P(1, "Normal", "2026-07-01", 10), P(1, "Normal", "2026-07-02", 20)],
    );
    expect(series.map((p) => p.value)).toEqual([10, 20, 30]);
  });
});

describe("changePct (U12)", () => {
  const series = [
    { date: "2026-07-01", value: 100 },
    { date: "2026-07-24", value: 110 },
    { date: "2026-07-30", value: 120 },
    { date: "2026-07-31", value: 130 },
  ];

  it("picks the nearest point at or before the target date", () => {
    expect(changePct(series, 1)).toBeCloseTo(((130 - 120) / 120) * 100); // 07-30
    expect(changePct(series, 7)).toBeCloseTo(((130 - 110) / 110) * 100); // ≤07-24
    expect(changePct(series, 30)).toBeCloseTo(30); // ≤07-01
  });

  it("returns null when no earlier point exists or series is tiny", () => {
    expect(changePct(series, 60)).toBeNull();
    expect(changePct([series[0]], 7)).toBeNull();
    expect(changePct([], 7)).toBeNull();
  });

  it("returns null instead of dividing by a zero baseline", () => {
    expect(
      changePct(
        [
          { date: "2026-07-01", value: 0 },
          { date: "2026-07-31", value: 50 },
        ],
        30,
      ),
    ).toBeNull();
  });
});
