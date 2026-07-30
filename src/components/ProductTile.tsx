import Link from "next/link";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";

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
  contents: Array<{ label: string; verified: boolean }>;
}) {
  return (
    <div className="card-hover flex flex-col rounded-xl border border-line bg-surface p-3">
      <Link href={`/products/${productId}`} className="flex min-h-0 flex-1 flex-col">
        <div className="shine mb-2 flex h-36 items-center justify-center bg-surface2 p-2">
          <img
            src={imageAt(imageUrl, "400w")}
            alt={name}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <p className="text-sm font-semibold leading-snug">{name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-base font-bold tabular-nums">{money(market)}</span>
          {perPack ? (
            <span className="text-xs text-mut tabular-nums">{money(perPack)}/pack</span>
          ) : null}
        </div>
      </Link>
      {contents.length > 0 ? (
        <details className="mt-2 border-t border-line pt-2 text-xs text-mut">
          <summary className="cursor-pointer select-none font-medium hover:text-ink">
            What&apos;s inside
          </summary>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {contents.map((c, i) => (
              <li key={i}>{c.label}</li>
            ))}
          </ul>
          {contents.some((c) => !c.verified) ? (
            <p className="mt-1.5 italic">Typical contents — verify before buying.</p>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
