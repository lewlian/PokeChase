import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CardTile } from "@/components/CardTile";
import { ProductTile } from "@/components/ProductTile";
import { SetLogo } from "@/components/SetLogo";
import { SEALED_TYPE_LABEL, SEALED_TYPE_ORDER, typicalPackCount } from "@/lib/classify";
import { money, shortDate } from "@/lib/format";
import {
  cardsForSet,
  chaseForSet,
  sealedForSet,
  setBySlug,
} from "@/lib/queries";
import type { SealedType } from "@/db/schema";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const set = setBySlug(slug);
  return { title: set ? `${set.name} — chase cards & prices` : "Set not found" };
}

const TABS = [
  ["chase", "Chase Cards"],
  ["cards", "All Cards"],
  ["sealed", "Sealed Products"],
] as const;

export default async function SetPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const set = setBySlug(slug);
  if (!set) notFound();

  const tab = (["chase", "cards", "sealed"].includes(sp.tab ?? "") ? sp.tab : "chase") as
    | "chase"
    | "cards"
    | "sealed";
  const sort = (["number", "price", "name"].includes(sp.sort ?? "") ? sp.sort : "number") as
    | "number"
    | "price"
    | "name";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-surface p-6">
        <SetLogo
          logoUrl={set.logoUrl}
          name={set.name}
          accent={set.era?.accent}
          className="h-16"
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: set.era?.accent }}>
            {set.era?.name}
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{set.name}</h1>
          <p className="text-sm text-mut">
            Released {shortDate(set.releaseDate)}
            {set.cardCount ? ` · ${set.cardCount} cards` : ""}
            {set.abbreviation ? ` · ${set.abbreviation}` : ""}
          </p>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-line" aria-label="Set sections">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/sets/${slug}?tab=${key}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "border border-b-0 border-line bg-surface text-ink"
                : "text-mut hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "chase" ? <ChaseTab groupId={set.groupId} /> : null}
      {tab === "cards" ? <CardsTab groupId={set.groupId} slug={slug} sort={sort} /> : null}
      {tab === "sealed" ? <SealedTab groupId={set.groupId} /> : null}
    </div>
  );
}

function ChaseTab({ groupId }: { groupId: number }) {
  const rows = chaseForSet(groupId);
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface p-6 text-mut">
        No chase data yet for this set — either prices haven&apos;t been ingested or no
        card clears the $15 notable floor.
      </p>
    );
  }
  return (
    <>
      <p className="text-sm text-mut">
        Ranked by current market value.{" "}
        <Link href="/learn/glossary" className="text-pokeblue hover:underline">
          What do Grail / Chase / Notable mean?
        </Link>
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((c) => (
          <CardTile key={c.productId} {...c} />
        ))}
      </div>
    </>
  );
}

function CardsTab({
  groupId,
  slug,
  sort,
}: {
  groupId: number;
  slug: string;
  sort: "number" | "price" | "name";
}) {
  const rows = cardsForSet(groupId, sort);
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-mut">Sort:</span>
        {(
          [
            ["number", "Card number"],
            ["price", "Price"],
            ["name", "Name"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/sets/${slug}?tab=cards&sort=${key}`}
            className={`rounded-full px-3 py-1 font-medium ${
              sort === key ? "bg-pokeblue text-white" : "bg-surface2 text-mut hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto tabular-nums text-mut">{rows.length} cards</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((c) => (
          <CardTile key={c.productId} {...c} />
        ))}
      </div>
    </>
  );
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {byType.get(t)!.map((p) => {
              const packs = typicalPackCount(p.productType, p.name);
              return (
                <ProductTile
                  key={p.productId}
                  productId={p.productId}
                  name={p.name}
                  imageUrl={p.imageUrl}
                  market={p.market}
                  perPack={p.market && packs && packs > 1 ? p.market / packs : null}
                  contents={p.contents}
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
            {byType.get("accessory")!.map((p) => (
              <li key={p.productId} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <Link href={`/products/${p.productId}`} className="truncate hover:text-pokeblue">
                  {p.name}
                </Link>
                <span className="font-semibold tabular-nums">{money(p.market)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
