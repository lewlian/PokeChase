import type { ChaseTier } from "@/db/schema";
import { TIER_LABEL } from "@/lib/chase";

const STYLES: Record<ChaseTier, string> = {
  grail:
    "bg-[image:var(--holo)] text-[#1c2033] font-bold shadow-sm",
  chase: "bg-pokeyellow text-[#1c2033] font-semibold",
  notable: "bg-surface2 text-mut font-medium",
};

export function TierBadge({ tier }: { tier: ChaseTier }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${STYLES[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
