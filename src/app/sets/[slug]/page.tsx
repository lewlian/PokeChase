import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CardTile } from "@/components/CardTile";
import { CardsTable, type CardsTableRow } from "@/components/CardsTable";
import { MarketSearch } from "@/components/market/MarketSearch";
import { ProductTile } from "@/components/ProductTile";
import { SetLogo } from "@/components/SetLogo";
import { SEALED_TYPE_LABEL, SEALED_TYPE_ORDER, typicalPackCount } from "@/lib/classify";
import { money, shortDate, displayCardName } from "@/lib/format";
import { sealedForSet, setBySlug } from "@/lib/queries";
import { cardsForSetWithChange, sparkKey, sparklinesFor } from "@/lib/queries-market";
import {
  filterCardRows,
  parseSetPageParams,
  sortCardRows,
  type SetPageParams,
  type SetSort,
} from "@/lib/market-params";
import { setCardStats } from "@/lib/set-stats";
import type { SealedType } from "@/db/schema";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = setBySlug(slug);
  return { title: set ? `${set.name} — cards & prices` : "Set not found" };
}

/** Sort chips shown above the card list. 7d/30d only make sense where the
 *  change columns are visible (table view). */
const SORT_CHIPS: Array<{ key: SetSort; label: string; tableOnly?: boolean }> = [
  { key: "number", label: "Number" },
  { key: "name", label: "Name" },
  { key: "rarity", label: "Rarity" },
  { key: "price", label: "Price" },
  { key: "d7", label: "7d %", tableOnly: true },
  { key: "d30", label: "30d %", tableOnly: true },
];

function chipQuery(p: SetPageParams, patch: Partial<SetPageParams>): string {
  const next = { ...p, ...patch };
  const q = new URLSearchParams();
  if (next.tab !== "cards") q.set("tab", next.tab);
  if (next.sort !== "price") q.set("sort", next.sort);
  const defaultDir = next.sort === "name" || next.sort === "number" ? "asc" : "desc";
  if (next.dir !== defaultDir) q.set("dir", next.dir);
  if (next.view !== "grid") q.set("view", next.view);
  if (next.q) q.set("q", next.q);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function SetPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const p = parseSetPageParams(await searchParams);
  const set = setBySlug(slug);
  if (!set) notFound();

  const allRows = cardsForSetWithChange(set.groupId);
  const stats = setCardStats(allRows);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <SetLogo logoUrl={set.logoUrl} name={set.name} accent={set.era?.accent} className="h-14" />
          <Stat label="Set name">
            <span className="flex items-center gap-2">
              {set.name}
              {set.language === "jp" ? (
                <span className="rounded bg-pokered px-1.5 py-0.5 text-xs font-bold uppercase text-white">
                  JP
                </span>
              ) : null}
            </span>
          </Stat>
          <Stat label="Series">
            <Link
              href={`/sets#${set.eraId}`}
              className="hover:underline"
              style={{ color: set.era?.accent }}
            >
              {set.era?.name}
            </Link>
          </Stat>
          <Stat label="Release date">{shortDate(set.releaseDate)}</Stat>
          <Stat label="Cards">
            {stats.secretCount > 0
              ? `${stats.baseCount} + ${stats.secretCount} Secret`
              : String(stats.total)}
          </Stat>
          {stats.topCard ? (
            <Stat label="Most expensive card">
              <span className="block max-w-56 truncate" title={stats.topCard.name}>
                {displayCardName(stats.topCard.name)}
              </span>
            </Stat>
          ) : null}
          {stats.totalValue > 0 ? (
            <Stat label="Full set market value">
              <span className="tabular-nums text-gain">{money(stats.totalValue)}</span>
            </Stat>
          ) : null}
        </div>
      </header>

      <nav
        className="flex gap-1 overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Set sections"
      >
        {(
          [
            ["cards", "Cards"],
            ["sealed", "Sealed Products"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/sets/${slug}${key === "cards" ? "" : "?tab=sealed"}`}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-semibold sm:px-4 ${
              p.tab === key
                ? "border border-b-0 border-line bg-surface text-ink"
                : "text-mut hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {p.tab === "cards" ? (
        <CardsSection slug={slug} p={p} allRows={allRows} />
      ) : (
        <SealedTab groupId={set.groupId} />
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-mut">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{children}</p>
    </div>
  );
}

function CardsSection({
  slug,
  p,
  allRows,
}: {
  slug: string;
  p: SetPageParams;
  allRows: ReturnType<typeof cardsForSetWithChange>;
}) {
  const rows = sortCardRows(filterCardRows(allRows, p.q), p.sort, p.dir);
  const baseQuery = chipQuery({ ...p, q: "" }, {}).replace(/^\?/, "");

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="min-w-56 flex-1 sm:max-w-xs">
          <MarketSearch initialQuery={p.q} baseQuery={baseQuery} placeholder="Name or Number…" />
        </div>
        {SORT_CHIPS.filter((c) => !c.tableOnly || p.view === "table").map(({ key, label }) => {
          const active = p.sort === key;
          const defaultDir = key === "name" || key === "number" ? "asc" : "desc";
          const nextDir = active ? (p.dir === "desc" ? "asc" : "desc") : defaultDir;
          return (
            <Link
              key={key}
              href={`/sets/${slug}${chipQuery(p, { sort: key, dir: nextDir })}`}
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${
                active
                  ? "bg-pokeyellow text-[#1c2033]"
                  : "bg-surface2 text-mut hover:text-ink"
              }`}
            >
              {label}
              <span aria-hidden="true" className="text-xs">
                {active ? (p.dir === "desc" ? "▾" : "▴") : "▴▾"}
              </span>
            </Link>
          );
        })}
        <span className="mx-1 text-mut">·</span>
        {(
          [
            ["grid", "Grid"],
            ["table", "Table"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/sets/${slug}${chipQuery(p, { view: key, sort: ["d7", "d30"].includes(p.sort) && key === "grid" ? "price" : p.sort })}`}
            className={`rounded-full px-3 py-1 font-medium ${
              p.view === key ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto tabular-nums text-mut">{rows.length} cards</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-mut">
          {p.q ? `No cards in this set match “${p.q}”.` : "No cards tracked for this set yet."}
        </p>
      ) : p.view === "table" ? (
        <SetCardsTable rows={rows} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((c) => (
            <CardTile key={c.productId} {...c} delta7Pct={c.d7Pct ?? undefined} market={c.market ?? undefined} />
          ))}
        </div>
      )}
    </>
  );
}

function SetCardsTable({ rows }: { rows: ReturnType<typeof cardsForSetWithChange> }) {
  const sparks = sparklinesFor(
    rows.filter((r) => r.subType).map((r) => ({ productId: r.productId, subType: r.subType })),
  );
  const tableRows: CardsTableRow[] = rows.map((r) => ({
    ...r,
    spark: sparks.get(sparkKey(r.productId, r.subType)) ?? [],
  }));
  return <CardsTable rows={tableRows} />;
}

function SealedTab({ groupId }: { groupId: number }) {
  const rows = sealedForSet(groupId);
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-mut">
        No sealed products tracked for this set.
      </p>
    );
  }
  const byType = new Map<SealedType, typeof rows>();
  for (const r of rows) {
    const arr = byType.get(r.productType) ?? [];
    arr.push(r);
    byType.set(r.productType, arr);
  }
  return (
    <div className="space-y-8">
      {SEALED_TYPE_ORDER.filter((t) => byType.has(t) && t !== "accessory").map((t) => (
        <section key={t}>
          <h2 className="mb-3 font-display text-lg font-bold">{SEALED_TYPE_LABEL[t]}</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {byType.get(t)!.map((prod) => {
              const packs = typicalPackCount(prod.productType, prod.name);
              return (
                <ProductTile
                  key={prod.productId}
                  productId={prod.productId}
                  name={prod.name}
                  imageUrl={prod.imageUrl}
                  market={prod.market}
                  perPack={prod.market && packs && packs > 1 ? prod.market / packs : null}
                  contents={prod.contents}
                />
              );
            })}
          </div>
        </section>
      ))}
      {byType.has("accessory") ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Accessories</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {byType.get("accessory")!.map((prod) => (
              <li key={prod.productId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <Link href={`/products/${prod.productId}`} className="truncate hover:text-pokeblue">
                  {prod.name}
                </Link>
                <span className="font-semibold tabular-nums">{money(prod.market)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
