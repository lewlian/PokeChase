import Link from "next/link";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";

export interface ProductContents {
  label: string;
  verified: boolean;
}

const SHOW_MAX = 6;

export function ProductTile({
  productId,
  name,
  imageUrl,
  market,
  perPack,
  contents,
}: {
  productId: number;
  name: string;
  imageUrl: string;
  market: number | null;
  perPack?: number | null;
  contents: ProductContents[];
}) {
  const official = contents.length > 0 && contents.every((c) => c.verified);
  const shown = contents.slice(0, SHOW_MAX);
  const more = contents.length - shown.length;

  return (
    <div className="card-hover flex flex-col rounded-xl border border-line bg-surface p-4 sm:flex-row sm:gap-4">
      <Link
        href={`/products/${productId}`}
        className="flex shrink-0 items-center justify-center sm:w-36"
      >
        <div className="shine flex h-32 w-full items-center justify-center bg-surface2 p-2 sm:h-36">
          <img
            src={imageAt(imageUrl, "400w")}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </Link>

      <div className="mt-3 flex min-w-0 flex-1 flex-col sm:mt-0">
        <Link href={`/products/${productId}`} className="group">
          <p className="text-sm font-semibold leading-snug group-hover:text-pokeblue">
            {name}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums">{money(market)}</span>
            {perPack ? (
              <span className="text-xs text-mut tabular-nums">{money(perPack)}/pack</span>
            ) : null}
          </div>
        </Link>

        {contents.length > 0 ? (
          <div className="mt-2 border-t border-line pt-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-mut">
              {official ? (
                <span className="text-gain">✓ Official contents</span>
              ) : (
                "Typical contents"
              )}
            </p>
            <ul className="space-y-0.5 text-xs leading-relaxed text-mut">
              {shown.map((c, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-pokeblue">▸</span>
                  <span className="min-w-0">{c.label}</span>
                </li>
              ))}
            </ul>
            {more > 0 ? (
              <Link
                href={`/products/${productId}`}
                className="mt-1 inline-block text-xs font-medium text-pokeblue hover:underline"
              >
                + {more} more…
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
