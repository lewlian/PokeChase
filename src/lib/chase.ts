import type { ChaseTier } from "@/db/schema";

/**
 * Chase tiering — pure function over a set's cards ranked by market price.
 * grail   = top 3 in set AND >= $100
 * chase   = top 10 in set OR  >= $30
 * notable = top 20 in set OR  >= $15
 * Cards below `notable` are not chase-listed.
 * Unit-tested in tests/chase.test.ts.
 */
export interface ChaseInput {
  productId: number;
  market: number; // best (max) market price across variants
}

export interface ChaseResult {
  productId: number;
  market: number;
  rank: number;
  tier: ChaseTier;
}

export const GRAIL_MIN = 100;
export const CHASE_MIN = 30;
export const NOTABLE_MIN = 15;

export function computeChase(cardsInSet: ChaseInput[]): ChaseResult[] {
  const ranked = [...cardsInSet]
    .filter((c) => c.market > 0)
    .sort((a, b) => b.market - a.market || a.productId - b.productId);

  const out: ChaseResult[] = [];
  ranked.forEach((c, i) => {
    const rank = i + 1;
    let tier: ChaseTier | null = null;
    if (rank <= 3 && c.market >= GRAIL_MIN) tier = "grail";
    else if (rank <= 10 || c.market >= CHASE_MIN) tier = "chase";
    else if (rank <= 20 || c.market >= NOTABLE_MIN) tier = "notable";
    if (tier && (rank <= 20 || c.market >= NOTABLE_MIN)) {
      out.push({ productId: c.productId, market: c.market, rank, tier });
    }
  });
  return out;
}

export const TIER_LABEL: Record<ChaseTier, string> = {
  grail: "Grail",
  chase: "Chase",
  notable: "Notable",
};
