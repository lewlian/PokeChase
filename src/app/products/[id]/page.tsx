import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AskTable } from "@/components/AskTable";
import { PriceChart } from "@/components/PriceChart";
import { imageAt } from "@/lib/images";
import { descriptionIntro } from "@/lib/contents";
import { money } from "@/lib/format";
import { SEALED_TYPE_LABEL, typicalPackCount } from "@/lib/classify";
import {
  latestVariantPrices,
  priceHistory,
  sealedById,
  sealedForSet,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = sealedById(Number(id));
  return { title: p ? `${p.name} — price & contents` : "Product not found" };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();
  const product = sealedById(productId);
  if (!product) notFound();

  const prices = latestVariantPrices(productId);
  const market = prices.reduce<number | null>(
    (acc, v) => (v.market !== null && (acc === null || v.market > acc) ? v.market : acc),
    null,
  );
  const history = priceHistory(productId);
  const intro = descriptionIntro(product.description);
  const packs = typicalPackCount(product.productType, product.name);
  const siblings = sealedForSet(product.groupId)
    .filter((s) => s.productId !== productId && s.productType !== "accessory" && s.market !== null)
    .slice(0, 10);

  return (
    <div className="space-y-10">
      <nav className="text-sm text-mut">
        <Link href="/sets" className="hover:text-ink">
          Sets
        </Link>{" "}
        /{" "}
        <Link href={`/sets/${product.setSlug}?tab=sealed`} className="hover:text-ink">
          {product.setName}
        </Link>{" "}
        / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="card-hover flex items-center justify-center rounded-2xl border border-line bg-surface p-6">
          <img
            src={imageAt(product.imageUrl, "in_1000x1000")}
            alt={product.name}
            className="max-h-72 w-auto object-contain"
          />
        </div>

        <div className="space-y-6">
          <header>
            <p className="text-xs font-bold uppercase tracking-widest text-pokeblue">
              {SEALED_TYPE_LABEL[product.productType]}
            </p>
            <h1 className="font-display text-3xl font-bold">{product.name}</h1>
            {intro ? <p className="mt-2 text-sm leading-relaxed text-mut">{intro}</p> : null}
          </header>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-surface p-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-mut">Market price</div>
              <div className="font-display text-4xl font-bold tabular-nums">{money(market)}</div>
            </div>
            {market && packs && packs > 1 ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-mut">Per pack</div>
                <div className="font-display text-2xl font-bold tabular-nums">
                  {money(market / packs)}
                </div>
              </div>
            ) : null}
            <div className="ml-auto flex flex-col items-end gap-1">
              <a
                href={product.tcgplayerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-pokeblue px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Buy on TCGplayer ↗
              </a>
              <span className="text-[11px] text-mut">live listings &amp; latest sales</span>
            </div>
          </div>

          <section>
            <h2 className="mb-2 font-display text-lg font-bold">Market vs. current asks</h2>
            <AskTable variants={prices} />
          </section>

          {product.contents.length > 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold">What&apos;s inside</h2>
                {product.contents.every((c) => c.verified) ? (
                  <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gain">
                    ✓ Official contents
                  </span>
                ) : (
                  <span className="rounded-full bg-surface2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mut">
                    Typical contents
                  </span>
                )}
              </div>
              <ul className="space-y-1.5 text-sm leading-relaxed">
                {product.contents.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-pokeblue">▸</span>
                    <span className="min-w-0">{c.label}</span>
                  </li>
                ))}
              </ul>
              {product.contents.some((c) => !c.verified) ? (
                <p className="mt-3 text-xs italic text-mut">
                  Typical contents for this product type — verify the listing before buying.
                </p>
              ) : (
                <p className="mt-3 text-xs text-mut">
                  From the official TCGplayer product description.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-xl font-bold">Price history</h2>
        <PriceChart history={history} />
      </section>

      {siblings.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">
            Compare {product.setName} sealed products
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-mut">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Market</th>
                  <th className="px-4 py-2 text-right">≈ $/pack</th>
                </tr>
              </thead>
              <tbody>
                {siblings.map((s) => {
                  const sPacks = typicalPackCount(s.productType, s.name);
                  return (
                    <tr key={s.productId} className="border-b border-line last:border-0">
                      <td className="px-4 py-2">
                        <Link href={`/products/${s.productId}`} className="font-medium hover:text-pokeblue">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-mut">{SEALED_TYPE_LABEL[s.productType]}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{money(s.market)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {s.market && sPacks && sPacks > 1 ? money(s.market / sPacks) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
