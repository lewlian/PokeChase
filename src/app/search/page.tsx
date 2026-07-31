import Link from "next/link";
import type { Metadata } from "next";
import { CardTile } from "@/components/CardTile";
import { LangChip } from "@/components/LangChip";
import { SetLogo } from "@/components/SetLogo";
import { imageAt } from "@/lib/images";
import { money, shortDate } from "@/lib/format";
import { searchAll } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query.length >= 2 ? searchAll(query) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Search</h1>
        <form action="/search" className="mt-4">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Card, set, or product name…"
            aria-label="Search"
            autoFocus
            className="w-full max-w-lg rounded-full border border-line bg-surface px-5 py-2.5 outline-none placeholder:text-mut focus:border-pokeblue"
          />
        </form>
      </header>

      {!results ? (
        <p className="text-mut">Type at least two characters to search.</p>
      ) : (
        <>
          {results.sets.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">Sets</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.sets.map((s) => (
                  <Link
                    key={s.groupId}
                    href={`/sets/${s.slug}`}
                    className="card-hover flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
                  >
                    <SetLogo logoUrl={s.logoUrl} name={s.name} className="h-10" />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {s.name} <LangChip language={s.language} />
                      </p>
                      <p className="text-xs text-mut">{shortDate(s.releaseDate)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results.cards.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">Cards</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {results.cards.map((c) => (
                  <CardTile key={c.productId} {...c} setName={c.setName} language={c.language} />
                ))}
              </div>
            </section>
          ) : null}

          {results.sealed.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold">Sealed products</h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {results.sealed.map((p) => (
                  <li key={p.productId}>
                    <Link
                      href={`/products/${p.productId}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-surface2"
                    >
                      <img
                        src={imageAt(p.imageUrl, "200w")}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 rounded object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{p.name}</p>
                        <p className="flex items-start gap-1 text-xs text-mut">
                          <LangChip language={p.language} />
                          <span className="min-w-0">{p.setName}</span>
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{money(p.market)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.cards.length === 0 &&
          results.sets.length === 0 &&
          results.sealed.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-6 text-mut">
              Nothing found for “{query}”. Try a shorter name — e.g. “Charizard” or
              “Evolving Skies”.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
