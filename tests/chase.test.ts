import { describe, it, expect } from "vitest";
import { computeChase } from "@/lib/chase";

function mk(n: number, market: number) {
  return { productId: n, market };
}

describe("computeChase", () => {
  it("assigns grail only to top-3 cards at $100+", () => {
    const res = computeChase([
      mk(1, 500),
      mk(2, 250),
      mk(3, 120),
      mk(4, 110), // rank 4 → not grail despite >=100
      mk(5, 40),
    ]);
    expect(res.find((r) => r.productId === 1)?.tier).toBe("grail");
    expect(res.find((r) => r.productId === 3)?.tier).toBe("grail");
    expect(res.find((r) => r.productId === 4)?.tier).toBe("chase");
  });

  it("cheap sets get chase tier without grails", () => {
    const res = computeChase([mk(1, 12), mk(2, 8), mk(3, 5)]);
    expect(res.every((r) => r.tier !== "grail")).toBe(true);
    expect(res.find((r) => r.productId === 1)?.tier).toBe("chase"); // top-10 rank
  });

  it("$30+ card outside top 10 is chase; $15+ card outside top 20 is notable", () => {
    // ranks 1-20: $100 down to $81; ranks 21-25: $20 down to $16
    const cards = Array.from({ length: 25 }, (_, i) =>
      mk(i + 1, i < 20 ? 100 - i : 20 - (i - 20)),
    );
    const res = computeChase(cards);
    expect(res.find((r) => r.productId === 15)?.tier).toBe("chase"); // rank 15, $86 ≥ 30
    expect(res.find((r) => r.productId === 25)?.tier).toBe("notable"); // rank 25, $16 ≥ 15
    expect(res).toHaveLength(25);
  });

  it("zero/negative prices are excluded and ranks are contiguous", () => {
    const res = computeChase([mk(1, 0), mk(2, 50), mk(3, 20)]);
    expect(res.map((r) => r.productId)).toEqual([2, 3]);
    expect(res.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("deterministic tie-break by productId", () => {
    const a = computeChase([mk(2, 50), mk(1, 50)]);
    expect(a.map((r) => r.productId)).toEqual([1, 2]);
  });

  it("empty input → empty output", () => {
    expect(computeChase([])).toEqual([]);
  });
});
