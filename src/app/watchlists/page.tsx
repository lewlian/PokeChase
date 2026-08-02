import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listWatchlists } from "@/lib/user-data";
import { CreateWatchlistForm } from "@/components/watchlists/CreateWatchlistForm";

export const metadata: Metadata = { title: "My watchlists" };

export default async function WatchlistsPage() {
  const supabase = await getServerSupabase();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/watchlists");

  const watchlists = await listWatchlists({ supabase, user });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">My watchlists</h1>
          <p className="mt-1 text-mut">Track the cards you&apos;re hunting, grouped your way.</p>
        </div>
        <CreateWatchlistForm />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {watchlists.map((w) => (
          <Link
            key={w.id}
            href={`/watchlists/${w.id}`}
            className="card-hover rounded-2xl border border-line bg-surface p-5"
          >
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="truncate">{w.name}</span>
              {w.is_default ? (
                <span className="shrink-0 rounded bg-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mut">
                  Default
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm tabular-nums text-mut">
              {w.itemCount} {w.itemCount === 1 ? "card" : "cards"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
