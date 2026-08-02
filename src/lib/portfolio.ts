/**
 * Pure portfolio-value aggregation (unit-tested; no DB access).
 *
 * Value-only model: the series is "what the user's CURRENT holdings were
 * worth on each past date" — retroactive, not transactional. Holdings with
 * no snapshot before a given date contribute 0 until their first price;
 * afterwards the last-seen price carries forward across gap days.
 */

export interface Holding {
  productId: number;
  subType: string;
  quantity: number;
}

export interface PricePoint {
  productId: number;
  subType: string;
  date: string; // YYYY-MM-DD, input may be unsorted
  market: number;
}

export interface ValuePoint {
  date: string;
  value: number;
}

const keyOf = (productId: number, subType: string) => `${productId}|${subType}`;

/** Daily portfolio value across the union of snapshot dates, forward-filled. */
export function portfolioSeries(holdings: Holding[], prices: PricePoint[]): ValuePoint[] {
  if (holdings.length === 0) return [];
  const qty = new Map<string, number>();
  for (const h of holdings) {
    const k = keyOf(h.productId, h.subType);
    qty.set(k, (qty.get(k) ?? 0) + h.quantity);
  }

  // per-holding price series, sorted by date
  const perKey = new Map<string, PricePoint[]>();
  const dates = new Set<string>();
  for (const p of prices) {
    const k = keyOf(p.productId, p.subType);
    if (!qty.has(k)) continue; // price data for something not held
    dates.add(p.date);
    const arr = perKey.get(k) ?? [];
    arr.push(p);
    perKey.set(k, arr);
  }
  for (const arr of perKey.values()) arr.sort((a, b) => a.date.localeCompare(b.date));

  const sortedDates = [...dates].sort();
  const cursor = new Map<string, number>(); // next index into each series
  const lastPrice = new Map<string, number>();

  return sortedDates.map((date) => {
    let value = 0;
    for (const [k, series] of perKey) {
      let i = cursor.get(k) ?? 0;
      while (i < series.length && series[i].date <= date) {
        lastPrice.set(k, series[i].market);
        i++;
      }
      cursor.set(k, i);
      const price = lastPrice.get(k);
      if (price !== undefined) value += price * (qty.get(k) ?? 0);
    }
    return { date, value: Math.round(value * 100) / 100 };
  });
}

/** % change of the latest value vs the nearest point at or before
 *  (latest date − daysBack). Null when there's no usable earlier point. */
export function changePct(series: ValuePoint[], daysBack: number): number | null {
  if (series.length < 2) return null;
  const latest = series[series.length - 1];
  const target = shiftDate(latest.date, -daysBack);
  let prev: ValuePoint | null = null;
  for (const p of series) {
    if (p.date <= target) prev = p;
    else break;
  }
  if (!prev || prev.date === latest.date || prev.value === 0) return null;
  return ((latest.value - prev.value) * 100) / prev.value;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
