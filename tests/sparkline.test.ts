import { describe, expect, it } from "vitest";
import { SPARK_H, SPARK_W, sparklinePoints, trendOf } from "@/lib/sparkline";

describe("sparklinePoints", () => {
  it("returns null for empty and single-point series (U3)", () => {
    expect(sparklinePoints([])).toBeNull();
    expect(sparklinePoints([42])).toBeNull();
  });

  it("draws two points across the full width (U4)", () => {
    const pts = sparklinePoints([1, 2])!.split(" ");
    expect(pts).toHaveLength(2);
    const [x1] = pts[0].split(",").map(Number);
    const [x2] = pts[1].split(",").map(Number);
    expect(x1).toBe(2); // left pad
    expect(x2).toBe(SPARK_W - 2); // right pad
  });

  it("maps min to the bottom and max to the top of the viewbox (U1)", () => {
    const pts = sparklinePoints([10, 30, 20])!.split(" ").map((p) => p.split(",").map(Number));
    const ys = pts.map(([, y]) => y);
    expect(ys[0]).toBe(SPARK_H - 2); // min value sits at the bottom
    expect(ys[1]).toBe(2); // max value sits at the top
    expect(ys[2]).toBeGreaterThan(ys[1]);
    expect(ys[2]).toBeLessThan(ys[0]);
  });

  it("draws a midline for a flat series (U2)", () => {
    const pts = sparklinePoints([5, 5, 5])!.split(" ").map((p) => p.split(",").map(Number));
    for (const [, y] of pts) expect(y).toBe(SPARK_H / 2);
  });

  it("normalizes extreme ranges within the viewbox (U5)", () => {
    const pts = sparklinePoints([0.01, 50_000, 3])!.split(" ").map((p) => p.split(",").map(Number));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(SPARK_W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(SPARK_H);
    }
  });
});

describe("trendOf (U6)", () => {
  it("classifies up, down, and flat with the ±0.05% threshold", () => {
    expect(trendOf([100, 110])).toBe("up");
    expect(trendOf([110, 100])).toBe("down");
    expect(trendOf([100, 100.0001])).toBe("flat");
    expect(trendOf([100, 100])).toBe("flat");
    expect(trendOf([])).toBe("flat");
    expect(trendOf([5])).toBe("flat");
  });

  it("handles a zero starting price without dividing by zero", () => {
    expect(trendOf([0, 10])).toBe("up");
    expect(trendOf([0, 0])).toBe("flat");
  });
});
