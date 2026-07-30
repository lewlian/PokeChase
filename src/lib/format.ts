export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function money(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function yearOf(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 4) : "—";
}

/** % the cheapest current ask sits above (+) or below (−) market price. */
export function askPremiumPct(
  ask: number | null | undefined,
  market: number | null | undefined,
): number | null {
  if (!ask || !market) return null;
  return ((ask - market) / market) * 100;
}

/** Extract sortable numeric card number from display number like "199/165" or "TG12/TG30". */
export function sortNumber(display: string | null | undefined): number | null {
  if (!display) return null;
  const m = display.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}
