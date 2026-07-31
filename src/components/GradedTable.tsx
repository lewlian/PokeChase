import Link from "next/link";
import { GRADE_ORDER, ebaySoldUrl, pricechartingSearchUrl } from "@/lib/graded";
import { money, shortDate } from "@/lib/format";
import type { GradedPriceRow } from "@/lib/queries";

interface CardRef {
  name: string;
  number: string | null;
  setName: string;
}

/**
 * Raw vs. graded market section. With provider data: the full grade ladder
 * with multipliers vs raw. Without: the raw price plus prefilled comp links
 * (eBay solds, PriceCharting) so the categorisation is always one tap away.
 */
export function GradedTable({
  card,
  rawMarket,
  graded,
}: {
  card: CardRef;
  rawMarket: number | null;
  graded: GradedPriceRow[];
}) {
  const byGrade = new Map(graded.map((g) => [g.grade, g]));
  const ordered = GRADE_ORDER.map((g) => byGrade.get(g)).filter(
    (g): g is GradedPriceRow => !!g && g.grade !== "Ungraded",
  );
  const pcUngraded = byGrade.get("Ungraded");
  const fetchedAt = graded[0]?.fetchedAt;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Raw vs. graded market</h2>
        <div className="flex gap-3 text-xs font-medium">
          <a
            href={ebaySoldUrl(card)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pokeblue hover:underline"
          >
            PSA 10 solds on eBay ↗
          </a>
          <a
            href={pricechartingSearchUrl(card)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pokeblue hover:underline"
          >
            All grades on PriceCharting ↗
          </a>
        </div>
      </div>

      {ordered.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2 text-right">Market</th>
                  <th className="px-3 py-2 text-right">vs raw</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line bg-surface2/50">
                  <td className="px-3 py-2 font-semibold">Raw (NM · TCGplayer)</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{money(rawMarket)}</td>
                  <td className="px-3 py-2 text-right text-mut">baseline</td>
                </tr>
                {pcUngraded ? (
                  <tr className="border-b border-line">
                    <td className="px-3 py-2">Raw (eBay solds)</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(pcUngraded.price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-mut">
                      {rawMarket ? `×${(pcUngraded.price / rawMarket).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ) : null}
                {ordered.map((g) => (
                  <tr key={g.grade} className="border-b border-line last:border-0">
                    <td className={`px-3 py-2 ${g.grade === "PSA 10" ? "font-bold" : "font-medium"}`}>
                      {g.grade}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        g.grade === "PSA 10" ? "font-bold" : "font-semibold"
                      }`}
                    >
                      {money(g.price)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-mut">
                      {rawMarket ? `×${(g.price / rawMarket).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-mut">
            Graded markets from PriceCharting (eBay sold comps), matched as
            “{graded[0]?.matchedName}”, updated {shortDate(fetchedAt)}. Raw baseline is
            the TCGplayer NM market price. Not financial advice.
          </p>
        </>
      ) : (
        <div className="text-sm text-mut">
          <p>
            The price shown on this page is the <span className="font-semibold text-ink">raw
            (ungraded, Near Mint) market</span> — currently{" "}
            <span className="font-bold text-ink tabular-nums">{money(rawMarket)}</span>. Graded
            copies (PSA/BGS/CGC slabs) trade on their own markets: a PSA 10 of a modern chase
            card often runs 2–4× raw, while a PSA 9 can sit near a clean raw copy. Use the comp
            links above to check this card&apos;s graded solds, or read the{" "}
            <Link href="/learn/grading" className="text-pokeblue hover:underline">
              grading guide
            </Link>
            .
          </p>
          <p className="mt-2 text-[11px]">
            Inline graded prices light up automatically once a PriceCharting API token is
            configured — see the README (&quot;Graded prices&quot;).
          </p>
        </div>
      )}
    </section>
  );
}
