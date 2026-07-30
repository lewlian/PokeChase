import type { Metadata } from "next";
import { GLOSSARY } from "@/content/glossary";
import { imageAt } from "@/lib/images";
import {
  exampleByNamePattern,
  exampleByRarity,
  type ExampleCard,
} from "@/lib/queries";
import { GlossaryList, type TermExample } from "./GlossaryList";

// Example thumbnails use live card data, so render per-request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Collector's glossary" };

/** Visual terms → a real example card from the database. */
function buildExamples(): Record<string, TermExample> {
  const specs: Array<[term: string, lookup: () => ExampleCard | null]> = [
    ["Holo (Holofoil)", () => exampleByRarity("Holo Rare")],
    ["Alt Art / Alternate Art", () => exampleByNamePattern("%(Alternate Art%")],
    ["Full Art", () => exampleByNamePattern("%(Full Art%")],
    ["Illustration Rare (IR)", () => exampleByRarity("Illustration Rare")],
    ["Special Illustration Rare (SIR)", () => exampleByRarity("Special Illustration Rare")],
    ["Hyper Rare / Gold Card", () => exampleByRarity("Hyper Rare")],
    ["Secret Rare", () => exampleByRarity("Secret Rare")],
    ["Rainbow Rare", () => exampleByRarity("Rainbow Rare")],
  ];
  const out: Record<string, TermExample> = {};
  for (const [term, lookup] of specs) {
    const card = lookup();
    if (card) {
      out[term] = {
        img: imageAt(card.imageUrl, "400w"),
        name: card.name,
        setName: card.setName,
        href: `/cards/${card.productId}`,
      };
    }
  }
  return out;
}

export default function GlossaryPage() {
  const examples = buildExamples();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Collector&apos;s glossary</h1>
        <p className="mt-1 text-mut">
          {GLOSSARY.length} terms every Pokémon TCG collector should know — visual terms
          include a real example card you can tap.
        </p>
      </header>
      <GlossaryList terms={GLOSSARY} examples={examples} />
    </div>
  );
}
