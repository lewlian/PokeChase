import { NextResponse } from "next/server";
import { searchAll } from "@/lib/queries";

/** Public JSON API: compact search used by the header typeahead. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "query must be at least 2 characters" }, { status: 400 });
  }
  const { cards, sets, sealed } = searchAll(q);
  return NextResponse.json(
    {
      query: q,
      sets: sets.slice(0, 3).map((s) => ({
        slug: s.slug,
        name: s.name,
        releaseDate: s.releaseDate,
        logoUrl: s.logoUrl,
      })),
      cards: cards.slice(0, 6).map((c) => ({
        productId: c.productId,
        name: c.name,
        number: c.number,
        setName: c.setName,
        imageUrl: c.imageUrl,
        market: c.market,
      })),
      sealed: sealed.slice(0, 3).map((p) => ({
        productId: p.productId,
        name: p.name,
        setName: p.setName,
        imageUrl: p.imageUrl,
        market: p.market,
      })),
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
