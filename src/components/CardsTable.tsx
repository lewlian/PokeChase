import Link from "next/link";
import type { ReactNode } from "react";
import { Delta } from "@/components/Delta";
import { LangChip } from "@/components/LangChip";
import { Sparkline } from "@/components/Sparkline";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";

export interface CardsTableRow {
  productId: number;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string;
  subType: string | null;
  market: number | null;
  d7Pct: number | null;
  d30Pct: number | null;
  setName?: string;
  setSlug?: string;
  language?: string;
  spark?: number[];
}

interface Props {
  rows: CardsTableRow[];
  showSet?: boolean;
  /** Extra right-hand cell per row (qty stepper, remove button, …). */
  trailingHeader?: ReactNode;
  renderTrailing?: (row: CardsTableRow) => ReactNode;
}

/** Compact stock-market-style card table — shared by the set table view,
 *  /market screener, watchlists, and the portfolio holdings list. */
export function CardsTable({ rows, showSet = false, trailingHeader, renderTrailing }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
            <th className="px-4 py-3 font-semibold">Card</th>
            <th className="px-3 py-3 text-right font-semibold">Price</th>
            <th className="px-3 py-3 text-right font-semibold">7d</th>
            <th className="px-3 py-3 text-right font-semibold">30d</th>
            <th className="px-3 py-3 text-right font-semibold">Trend</th>
            {renderTrailing ? <th className="px-3 py-3 text-right font-semibold">{trailingHeader}</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={`${r.productId}-${r.subType ?? ""}`} className="hover:bg-surface2">
              <td className="px-4 py-2">
                <Link href={`/cards/${r.productId}`} className="flex items-center gap-3">
                  <img
                    src={imageAt(r.imageUrl, "200w")}
                    alt=""
                    loading="lazy"
                    className="h-12 w-9 shrink-0 rounded object-contain"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="flex items-center gap-1 text-xs text-mut">
                      {r.language ? <LangChip language={r.language} /> : null}
                      <span className="truncate">
                        {[r.number, r.rarity, showSet ? r.setName : null]
                          .filter(Boolean)
                          .join(" · ")}
                        {r.subType && r.subType !== "Normal" ? ` · ${r.subType}` : ""}
                      </span>
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(r.market)}</td>
              <td className="px-3 py-2 text-right">
                <Delta value={r.d7Pct} />
                {r.d7Pct == null ? <span className="text-xs text-mut">—</span> : null}
              </td>
              <td className="px-3 py-2 text-right">
                <Delta value={r.d30Pct} />
                {r.d30Pct == null ? <span className="text-xs text-mut">—</span> : null}
              </td>
              <td className="px-3 py-2">
                <span className="flex justify-end">
                  <Sparkline series={r.spark ?? []} />
                </span>
              </td>
              {renderTrailing ? (
                <td className="px-3 py-2 text-right">{renderTrailing(r)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
