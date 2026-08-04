import { rarityAbbrev, isPremiumRarity } from "@/lib/rarity";

/** Compact metadata tags for card rows/tiles, sized to sit beside LangChip. */
const TAG_BASE =
  "inline-block shrink-0 rounded border px-1 py-px align-middle text-[9px] font-bold uppercase leading-tight tracking-wide";

export function NumberTag({ number }: { number?: string | null }) {
  if (!number) return null;
  return (
    <span className={`${TAG_BASE} border-line bg-surface2 tabular-nums text-mut`}>
      {number}
    </span>
  );
}

export function RarityTag({ rarity }: { rarity?: string | null }) {
  const abbrev = rarityAbbrev(rarity);
  if (!abbrev) return null;
  const premium = isPremiumRarity(rarity);
  return (
    <span
      title={rarity ?? undefined}
      className={`${TAG_BASE} ${
        premium
          ? "border-pokeyellowink/50 text-pokeyellowink"
          : "border-line bg-surface2 text-mut"
      }`}
    >
      {abbrev}
    </span>
  );
}
