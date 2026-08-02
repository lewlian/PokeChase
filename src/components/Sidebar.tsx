"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface EraNavItem {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  accent: string;
  setCount: number;
}

export function Sidebar({ eras, signedIn = false }: { eras: EraNavItem[]; signedIn?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav
        className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-6"
        aria-label="Dashboard and eras"
      >
        <Link
          href="/"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            pathname === "/"
              ? "bg-pokeyellow text-[#1c2033]"
              : "bg-surface text-ink hover:bg-surface2"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
              fill="currentColor"
            />
          </svg>
          Dashboard
        </Link>

        {signedIn ? (
          <div>
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-mut">
              My collection
            </p>
            <ul className="space-y-0.5">
              {(
                [
                  ["/portfolio", "Portfolio"],
                  ["/watchlists", "Watchlists"],
                ] as const
              ).map(([href, label]) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`block rounded-lg px-3 py-1.5 text-sm font-medium ${
                        active ? "bg-surface2 text-ink" : "hover:bg-surface2"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-mut">
            Browse by era
          </p>
          <ul className="space-y-0.5">
            {eras.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/sets#${e.id}`}
                  className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-surface2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: e.accent }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:text-ink">
                      {e.name}
                    </span>
                    <span className="block text-[11px] tabular-nums text-mut">
                      {e.startYear}–{e.endYear ?? "now"} · {e.setCount} sets
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/sets"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-pokeblue hover:bg-surface2"
        >
          All sets →
        </Link>
      </nav>
    </aside>
  );
}
