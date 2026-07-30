import Link from "next/link";
import type { Metadata } from "next";
import { Delta } from "@/components/Delta";
import { imageAt } from "@/lib/images";
import { money } from "@/lib/format";
import { movers } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "7-day market movers" };

export default function MoversPage() {
  const up = movers("up", 25);
  const down = movers("down", 25);

  if (up.length === 0 && down.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold">Market movers</h1>
        <p className="mt-4 rounded-xl border border-line bg-surface p-6 text-mut">
          Movers need at least ~7 days of snapshots. They&apos;ll appear as daily price
          history accrues.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Market movers</h1>
        <p className="mt-1 text-mut">
          Biggest 7-day changes in TCGplayer market price (items $5+ only).
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Top gainers", rows: up },
          { title: "Top losers", rows: down },
        ].map((col) => (
          <div key={col.title} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-2 font-display text-lg font-bold">{col.title}</h2>
            <ul className="divide-y divide-line">
              {col.rows.map((m) => (
                <li key={m.productId}>
                  <Link
                    href={m.kind === "card" ? `/cards/${m.productId}` : `/products/${m.productId}`}
                    className="flex items-center gap-3 py-2 hover:bg-surface2"
                  >
                    <img
                      src={imageAt(m.imageUrl, "200w")}
                      alt=""
                      loading="lazy"
                      className="h-12 w-9 rounded object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-mut">
                        {m.setName} · {m.kind === "sealed" ? "sealed" : "single"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{money(m.cur)}</div>
                      <div className="text-xs text-mut tabular-nums">was {money(m.prev)}</div>
                      <Delta value={m.pct} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
