import Link from "next/link";
import type { ReactNode } from "react";
import { Delta } from "@/components/Delta";
import { LangChip } from "@/components/LangChip";
import { NumberTag, RarityTag } from "@/components/CardTags";
import { Sparkline } from "@/components/Sparkline";
import { imageAt } from "@/lib/images";
import { money, displayCardName } from "@/lib/format";

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
  /**
   * Pre-rendered trailing cells keyed by `${productId}|${subType ?? ""}`.
   * Prefer this over renderTrailing when the table sits inside a client
   * component: a function prop can't cross that boundary, and the whole
   * subtree silently fails to hydrate if one does.
   */
  trailing?: Record<string, ReactNode>;
  /**
   * Makes column headers sortable links. hrefs maps a sort key
   * (name/price/d7/d30) to the URL that toggles it; keys absent from the map
   * render as plain headers. Precomputed strings, not a callback — same
   * serialization constraint as `trailing`.
   */
  headerSort?: { sort: string; dir: "asc" | "desc"; hrefs: Record<string, string> };
}

const HEADER_COLUMNS: Array<{ key: string; label: string; align: "left" | "right" }> = [
  { key: "name", label: "Card", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "d7", label: "7d", align: "right" },
  { key: "d30", label: "30d", align: "right" },
];

/** Compact stock-market-style card table — shared by the set table view,
 *  /market screener, watchlists, and the portfolio holdings list. */
export function CardsTable({
  rows,
  showSet = false,
  trailingHeader,
  renderTrailing,
  trailing,
  headerSort,
}: Props) {
  const hasTrailing = Boolean(renderTrailing || trailing);
  const trailingFor = (r: CardsTableRow): ReactNode =>
    trailing ? trailing[`${r.productId}|${r.subType ?? ""}`] : renderTrailing?.(r);
  const headerCell = ({ key, label, align }: (typeof HEADER_COLUMNS)[number]) => {
    const href = headerSort?.hrefs[key];
    const active = headerSort?.sort === key;
    const cls =
      align === "right" ? "px-3 py-3 text-right font-semibold" : "px-4 py-3 text-left font-semibold";
    if (!href) return <th key={key} className={cls}>{label}</th>;
    return (
      <th key={key} className={cls} aria-sort={active ? (headerSort!.dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link
          href={href}
          className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <span aria-hidden="true">{active ? (headerSort!.dir === "desc" ? "↓" : "↑") : "↕"}</span>
        </Link>
      </th>
    );
  };
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
            {HEADER_COLUMNS.map(headerCell)}
            <th className="px-3 py-3 text-right font-semibold">Trend</th>
            {hasTrailing ? <th className="px-3 py-3 text-right font-semibold">{trailingHeader}</th> : null}
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
                    <span className="block truncate font-medium">{displayCardName(r.name)}</span>
                    <span className="flex items-center gap-1 text-xs text-mut">
                      {r.language ? <LangChip language={r.language} /> : null}
                      <NumberTag number={r.number} />
                      <RarityTag rarity={r.rarity} />
                      <span className="truncate">
                        {[
                          showSet ? r.setName : null,
                          r.subType && r.subType !== "Normal" ? r.subType : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
              {hasTrailing ? (
                <td className="px-3 py-2 text-right">{trailingFor(r)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
