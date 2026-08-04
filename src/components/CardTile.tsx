import Link from "next/link";
import { imageAt } from "@/lib/images";
import { money, displayCardName } from "@/lib/format";
import { Delta } from "./Delta";
import { LangChip } from "./LangChip";
import { NumberTag, RarityTag } from "./CardTags";
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
  language?: string;
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
        <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug">
          {p.rank ? <span className="mr-1 text-mut">#{p.rank}</span> : null}
          {displayCardName(p.name)}
        </p>
        {p.tier ? <TierBadge tier={p.tier} /> : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <LangChip language={p.language} />
        <NumberTag number={p.number} />
        <RarityTag rarity={p.rarity} />
      </div>
      {p.setName ? (
        <p className="mt-1 truncate text-xs text-mut">{p.setName}</p>
      ) : null}
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
