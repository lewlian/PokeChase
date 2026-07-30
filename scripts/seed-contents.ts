/**
 * Seed "what's inside" contents for sealed products from curated templates.
 * Contents are typical/era-aware and flagged verified=false (UI shows
 * "typical contents") unless later hand-verified. Replaces unverified rows.
 *   npx tsx scripts/seed-contents.ts
 */
import { eq, and } from "drizzle-orm";
import { getDb, tables } from "../src/db";
import { typicalPackCount } from "../src/lib/classify";
import { parseOfficialContents } from "../src/lib/contents";
import { runJob } from "./lib/util";
import type { SealedType } from "../src/db/schema";

/** Promo name from product name brackets, e.g. "3-Pack Blister [Binacle]". */
function bracketPromo(name: string): string | null {
  const m = name.match(/\[([^\]]+)\]/);
  if (!m) return null;
  if (/set of|packs?\b|exclusive/i.test(m[1])) return null;
  return m[1];
}

function contentsFor(
  type: SealedType,
  name: string,
  eraId: string,
): Array<{ label: string; quantity: number | null }> {
  const promo = bracketPromo(name);
  const packs = typicalPackCount(type, name);
  const packLabel = (n: number) => ({ label: `${n} booster pack${n > 1 ? "s" : ""}`, quantity: n });
  const modernEtbPacks = eraId === "sword-shield" || eraId === "sun-moon" ? 8 : 9;

  switch (type) {
    case "booster_box":
      return [packLabel(packs ?? 36)];
    case "etb":
      return [
        packLabel(modernEtbPacks),
        { label: "65 card sleeves (set artwork)", quantity: 65 },
        { label: "45 Energy cards", quantity: 45 },
        { label: "Dice, condition markers & player's guide", quantity: 1 },
        { label: "1 code card (Pokémon TCG Live)", quantity: 1 },
        ...(promo ? [{ label: `Promo card: ${promo}`, quantity: 1 }] : []),
      ];
    case "booster_bundle":
      return [packLabel(packs ?? 6)];
    case "loose_pack":
      return [packLabel(packs ?? 1)];
    case "blister":
      return [
        packLabel(packs ?? 1),
        ...(promo
          ? [{ label: `Promo card: ${promo}`, quantity: 1 }]
          : [{ label: "Promo card or coin (varies)", quantity: 1 }]),
      ];
    case "upc":
      return [
        { label: "Booster packs (typically 10–16)", quantity: null },
        { label: "Premium promo card(s), often metal", quantity: null },
        { label: "Premium accessories (playmat, sleeves, etc.)", quantity: null },
      ];
    case "build_battle":
      return [
        packLabel(4),
        { label: "1 evolution/starter deck kit with promos", quantity: 1 },
      ];
    case "tin":
      return /mini tin/i.test(name)
        ? [
            packLabel(2),
            { label: "1 art card or sticker sheet", quantity: 1 },
          ]
        : [
            { label: "4–5 booster packs (varies by tin)", quantity: null },
            ...(promo ? [{ label: `Promo card: ${promo}`, quantity: 1 }] : []),
          ];
    case "collection_box":
      return [
        { label: "Booster packs (count varies by product)", quantity: null },
        ...(promo ? [{ label: `Featured promo: ${promo}`, quantity: 1 }] : [{ label: "Promo card(s)", quantity: null }]),
      ];
    case "deck":
      return [{ label: "1 ready-to-play 60-card deck + accessories", quantity: 1 }];
    default:
      return [];
  }
}

async function main() {
  const db = getDb();
  await runJob("seed-contents", async () => {
    const products = await db
      .select({
        productId: tables.sealedProducts.productId,
        name: tables.sealedProducts.name,
        productType: tables.sealedProducts.productType,
        description: tables.sealedProducts.description,
        eraId: tables.sets.eraId,
      })
      .from(tables.sealedProducts)
      .innerJoin(tables.sets, eq(tables.sets.groupId, tables.sealedProducts.groupId));

    let written = 0;
    let official = 0;
    for (const p of products) {
      // Prefer the official TCGplayer "includes:" list (verified=true);
      // fall back to era-aware templates (verified=false).
      const parsed = parseOfficialContents(p.description);
      const rows =
        parsed.length > 0
          ? parsed.map((label) => {
              const m = label.match(/^(\d+)\s/);
              return { label, quantity: m ? Number(m[1]) : null, verified: true };
            })
          : contentsFor(p.productType, p.name, p.eraId).map((r) => ({ ...r, verified: false }));
      if (rows.length === 0) continue;
      if (parsed.length > 0) official++;
      await db
        .delete(tables.sealedContents)
        .where(and(eq(tables.sealedContents.productId, p.productId)));
      for (const r of rows) {
        await db.insert(tables.sealedContents).values({
          productId: p.productId,
          label: r.label,
          quantity: r.quantity,
          verified: r.verified,
        });
        written++;
      }
    }
    console.log(`  contents rows: ${written} (official lists: ${official} products)`);
    return written;
  });
}

main();
