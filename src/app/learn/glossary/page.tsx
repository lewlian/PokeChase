import type { Metadata } from "next";
import { GLOSSARY } from "@/content/glossary";
import { GlossaryList } from "./GlossaryList";

export const metadata: Metadata = { title: "Collector's glossary" };

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Collector&apos;s glossary</h1>
        <p className="mt-1 text-mut">
          {GLOSSARY.length} terms every Pokémon TCG collector should know.
        </p>
      </header>
      <GlossaryList terms={GLOSSARY} />
    </div>
  );
}
