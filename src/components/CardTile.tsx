import Link from "next/link";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";
import { Delta } from "./Delta";
import { TierBadge } from "./TierBadge";
import type { ChaseTier } from "@/db/schema";

export interface CardTileProps {
  productId: number;
  name: string;
  number?: string | null;
  rarity?: string | null;
  imageUrl: string;
  market?: number | null;
  delta7Pct?: number | null;
  tier?: ChaseTier;
  rank?: number;
  setName?: string;
}

export function CardTile(p: CardTileProps) {
  const inner = (
    <div className="card-hover flex h-full flex-col rounded-xl border border-line bg-surface p-3">
      <div className="shine mb-2">
        {/* Pokémon cards are 5:7 */}
        <img
          src={imageAt(p.imageUrl, "400w")}
          alt={`${p.name} card`}
          loading="lazy"
          className="aspect-5/7 w-full rounded-lg bg-surface2 object-contain"
        />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={p.name}>
            {p.rank ? <span className="mr-1 text-mut">#{p.rank}</span> : null}
            {p.name}
          </p>
          <p className="truncate text-xs text-mut">
            {[p.number, p.rarity, p.setName].filter(Boolean).join(" · ")}
          </p>
        </div>
        {p.tier ? <TierBadge tier={p.tier} /> : null}
      </div>
      <div className="mt-auto flex items-baseline justify-between pt-2">
        <span className="text-base font-bold tabular-nums">{money(p.market)}</span>
        <Delta value={p.delta7Pct} label="7d" />
      </div>
    </div>
  );

  const card = p.tier === "grail" ? <div className="holo-ring h-full">{inner}</div> : inner;
  return (
    <Link href={`/cards/${p.productId}`} className="block h-full">
      {card}
    </Link>
  );
}
