import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GUIDES } from "@/content/guides";
import { GuideVisual } from "@/components/learn/GuideVisual";

// Guides embed live-price visuals (real cards, charts), so render per-request.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  return { title: guide ? guide.title : "Guide not found" };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  const idx = GUIDES.indexOf(guide);
  const next = GUIDES[idx + 1];

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm text-mut">
        <Link href="/learn" className="hover:text-ink">
          Learn
        </Link>{" "}
        / <span className="text-ink">{guide.title}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-pokeblue">
          Guide · {guide.minutes} min read
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{guide.title}</h1>
        <p className="mt-2 text-mut">{guide.blurb}</p>
      </header>

      <div className="space-y-8">
        {guide.sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-3 font-display text-xl font-bold">{s.h}</h2>
            <div className="space-y-3">
              {s.ps.map((p, i) => (
                <p key={i} className="leading-relaxed text-ink/90">
                  {p}
                </p>
              ))}
            </div>
            {s.visual ? <GuideVisual spec={s.visual} /> : null}
          </section>
        ))}
      </div>

      <footer className="mt-10 space-y-4 border-t border-line pt-6">
        <p className="text-xs text-mut">
          Educational content only — not financial advice. Terms in these guides are
          defined in the{" "}
          <Link href="/learn/glossary" className="text-pokeblue hover:underline">
            glossary
          </Link>
          .
        </p>
        {next ? (
          <Link
            href={`/learn/${next.slug}`}
            className="card-hover block rounded-xl border border-line bg-surface p-4"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-pokeblue">
              Next guide
            </span>
            <span className="mt-0.5 block font-display font-bold">{next.title}</span>
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
