import type { VariantPrice } from "@/lib/queries";
import { askPremiumPct, money, pct, shortDate } from "@/lib/format";

/**
 * Market vs. current asks, per variant. "Best ask" = cheapest active TCGplayer
 * listing (lowPrice); "Direct" = cheapest TCGplayer Direct listing. Snapshots
 * refresh daily, so this is the ask ladder as of the last ingest.
 */
export function AskTable({ variants }: { variants: VariantPrice[] }) {
  if (variants.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-sm text-mut">
        No current price recorded for this item.
      </p>
    );
  }
  const asOf = variants[0]?.date;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
            <th className="px-4 py-2">Variant</th>
            <th className="px-4 py-2 text-right">Market</th>
            <th className="px-4 py-2 text-right">Best ask</th>
            <th className="px-4 py-2 text-right">Ask vs market</th>
            <th className="px-4 py-2 text-right">Direct ask</th>
            <th className="px-4 py-2 text-right">Mid</th>
            <th className="px-4 py-2 text-right">High</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const premium = askPremiumPct(v.low, v.market);
            return (
              <tr key={v.subType} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-medium">{v.subType}</td>
                <td className="px-4 py-2 text-right font-bold tabular-nums">{money(v.market)}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums text-pokeblue">
                  {money(v.low)}
                </td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${
                    premium === null ? "text-mut" : premium <= 0 ? "text-gain" : "text-loss"
                  }`}
                  title="How the cheapest listing compares to market price"
                >
                  {pct(premium)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{money(v.directLow)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{money(v.mid)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{money(v.high)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-2 text-[11px] text-mut">
        Asks = active TCGplayer listings as of {shortDate(asOf)} (refreshed daily).
        A negative “ask vs market” means the cheapest listing sits below market price.
      </p>
    </div>
  );
}
