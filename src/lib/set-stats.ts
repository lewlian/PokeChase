/** Pure stats for a set's header bar: "86 + 87 Secret", the most expensive
 *  card, and the full-set market value — computed from the priced card rows. */

export interface SetStatsRow {
  name: string;
  number: string | null;
  sortNumber: number | null;
  market: number | null;
}

export interface SetStats {
  total: number;
  /** Cards within the printed set size. */
  baseCount: number;
  /** Cards numbered above the printed set size (215/203 etc.). */
  secretCount: number;
  /** The printed denominator (203 in "215/203"), when derivable. */
  printedTotal: number | null;
  topCard: { name: string; market: number } | null;
  /** Sum of every card's best-variant market price. */
  totalValue: number;
}

export function setCardStats(rows: SetStatsRow[]): SetStats {
  // Printed size = the most common numeric denominator ("113/165" → 165)
  const denomCounts = new Map<number, number>();
  for (const r of rows) {
    const m = r.number?.match(/\/\s*[A-Za-z]*(\d+)\s*$/);
    if (m) {
      const d = Number(m[1]);
      denomCounts.set(d, (denomCounts.get(d) ?? 0) + 1);
    }
  }
  let printedTotal: number | null = null;
  let best = 0;
  for (const [d, count] of denomCounts) {
    if (count > best || (count === best && printedTotal !== null && d < printedTotal)) {
      printedTotal = d;
      best = count;
    }
  }

  const secretCount =
    printedTotal === null
      ? 0
      : rows.filter((r) => r.sortNumber !== null && r.sortNumber > printedTotal).length;

  let topCard: SetStats["topCard"] = null;
  let totalValue = 0;
  for (const r of rows) {
    if (r.market === null) continue;
    totalValue += r.market;
    if (!topCard || r.market > topCard.market) topCard = { name: r.name, market: r.market };
  }

  return {
    total: rows.length,
    baseCount: rows.length - secretCount,
    secretCount,
    printedTotal,
    topCard,
    totalValue: Math.round(totalValue * 100) / 100,
  };
}
