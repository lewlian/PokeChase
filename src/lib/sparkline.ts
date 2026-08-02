/** Pure geometry for inline SVG sparklines (no chart library — these render
 *  per-row in dense tables, where recharts would be far too heavy). */

export const SPARK_W = 80;
export const SPARK_H = 24;
const PAD = 2;

export type Trend = "up" | "down" | "flat";

/** Direction of a series, using the same ±0.05% flat threshold as <Delta>. */
export function trendOf(series: number[]): Trend {
  if (series.length < 2) return "flat";
  const first = series[0];
  const last = series[series.length - 1];
  if (first === 0) return last > 0 ? "up" : "flat";
  const pctChange = ((last - first) / first) * 100;
  if (Math.abs(pctChange) < 0.05) return "flat";
  return pctChange > 0 ? "up" : "down";
}

/**
 * SVG polyline `points` string for a series, normalized into an
 * SPARK_W × SPARK_H viewBox with PAD padding. Flat series draw a midline.
 * Returns null when there aren't enough points to draw a line.
 */
export function sparklinePoints(series: number[]): string | null {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const innerW = SPARK_W - PAD * 2;
  const innerH = SPARK_H - PAD * 2;
  const stepX = innerW / (series.length - 1);
  return series
    .map((v, i) => {
      const x = PAD + i * stepX;
      // y axis points down; highest value sits at the top
      const y = span === 0 ? SPARK_H / 2 : PAD + innerH - ((v - min) / span) * innerH;
      return `${round2(x)},${round2(y)}`;
    })
    .join(" ");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
