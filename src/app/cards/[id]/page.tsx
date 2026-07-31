import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AskTable } from "@/components/AskTable";
import { GradedTable } from "@/components/GradedTable";
import { PriceChart } from "@/components/PriceChart";
import { TierBadge } from "@/components/TierBadge";
import { Delta } from "@/components/Delta";
import { CardTile } from "@/components/CardTile";
import { imageAt } from "@/lib/images";
import { money, shortDate } from "@/lib/format";
import {
  cardById,
  chaseForSet,
  gradedPricesFor,
  latestVariantPrices,
  priceHistory,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const card = cardById(Number(id));
  return { title: card ? `${card.name} ${card.number ?? ""} — price & history` : "Card not found" };
}

export default async function CardPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const card = cardById(productId);
  if (!card) notFound();

  const variants = latestVariantPrices(productId);
  const history = priceHistory(productId);
  const graded = gradedPricesFor(productId);
  const best = variants.reduce<number | null>(
    (acc, v) => (v.market !== null && (acc === null || v.market > acc) ? v.market : acc),
    null,
  );
  const related = chaseForSet(card.groupId)
    .filter((c) => c.productId !== productId)
    .slice(0, 4);

  return (
    <div className="space-y-10">
      <nav className="text-sm text-mut">
        <Link href="/sets" className="hover:text-ink">
          Sets
        </Link>{" "}
        /{" "}
        <Link href={`/sets/${card.setSlug}`} className="hover:text-ink">
          {card.setName}
        </Link>{" "}
        / <span className="text-ink">{card.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="card-hover mx-auto w-full max-w-xs md:mx-0">
          <div className="shine">
            <img
              src={imageAt(card.imageUrl, "in_1000x1000")}
              alt={`${card.name} ${card.number ?? ""} card`}
              className="aspect-5/7 w-full rounded-xl bg-surface2 object-contain shadow-lg"
            />
          </div>
        </div>

        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{card.name}</h1>
              {card.chase ? <TierBadge tier={card.chase.tier} /> : null}
            </div>
            <p className="mt-1 text-mut">
              {[card.number, card.rarity].filter(Boolean).join(" · ")} ·{" "}
              <Link href={`/sets/${card.setSlug}`} className="text-pokeblue hover:underline">
                {card.setName}
              </Link>{" "}
              ({shortDate(card.releaseDate)})
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-surface p-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-mut">Market price</div>
              <div className="font-display text-4xl font-bold tabular-nums">{money(best)}</div>
            </div>
            {card.chase ? (
              <div className="space-y-1 text-sm">
                <div>
                  Rank <span className="font-bold">#{card.chase.rank}</span> in set
                </div>
                <div className="flex gap-3">
                  <Delta value={card.chase.delta7Pct} label="7d" />
                  <Delta value={card.chase.delta30Pct} label="30d" />
                </div>
              </div>
            ) : null}
            <div className="ml-auto flex flex-col items-end gap-2">
              <a
                href={card.tcgplayerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-pokeblue px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                View on TCGplayer ↗
              </a>
              <a
                href={card.tcgplayerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-pokeblue hover:underline"
                title="TCGplayer shows recent completed sales on the product page"
              >
                View latest sales on TCGplayer ↗
              </a>
            </div>
          </div>

          <section>
            <h2 className="mb-2 font-display text-lg font-bold">Market vs. current asks</h2>
            <AskTable variants={variants} />
          </section>

          <GradedTable
            card={{ name: card.name, number: card.number, setName: card.setName }}
            rawMarket={best}
            graded={graded}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-bold">Price history</h2>
        <PriceChart history={history} />
      </section>

      {related.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">
            More chase cards from {card.setName}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((c) => (
              <CardTile key={c.productId} {...c} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
