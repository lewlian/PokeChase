"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SetsNavEra } from "@/lib/queries";

export interface EraNavItem {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  accent: string;
  setCount: number;
}

interface SetsNav {
  en: SetsNavEra[];
  jp: SetsNavEra[];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
    </svg>
  );
}

/** Which branches contain the current page, so they start expanded. */
function branchesFor(pathname: string, nav: SetsNav): Set<string> {
  const open = new Set<string>();
  const slug = pathname.startsWith("/sets/") ? pathname.slice("/sets/".length) : null;
  if (!slug) return open;
  for (const lang of ["en", "jp"] as const) {
    for (const era of nav[lang]) {
      if (era.sets.some((s) => s.slug === slug)) {
        open.add(lang);
        open.add(`${lang}:${era.id}`);
      }
    }
  }
  return open;
}

export function Sidebar({
  eras,
  setsNav,
  signedIn = false,
}: {
  eras: EraNavItem[];
  setsNav: SetsNav;
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Set<string>>(() => branchesFor(pathname, setsNav));

  // Auto-expand the branch for the page we navigated to (adjust during render)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    const auto = branchesFor(pathname, setsNav);
    if (auto.size > 0) setOpen((prev) => new Set([...prev, ...auto]));
  }

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const yearsOf = (eraId: string) => {
    const e = eras.find((x) => x.id === eraId);
    return e ? `${e.startYear}–${e.endYear ?? "now"}` : null;
  };

  const langBranch = (lang: "en" | "jp", label: string) => {
    const tree = setsNav[lang];
    if (tree.length === 0) return null;
    const isOpen = open.has(lang);
    const setTotal = tree.reduce((n, e) => n + e.sets.length, 0);
    return (
      <div>
        {/* Top level has no page of its own — the whole row toggles */}
        <button
          type="button"
          onClick={() => toggle(lang)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface2"
        >
          <Chevron open={isOpen} />
          <span className="flex-1 text-left">{label}</span>
          <span className="text-[11px] tabular-nums text-mut">{setTotal}</span>
        </button>

        {isOpen ? (
          <ul className="ml-2 space-y-0.5 border-l border-line pl-2">
            {tree.map((era) => {
              const key = `${lang}:${era.id}`;
              const eraOpen = open.has(key);
              return (
                <li key={key}>
                  {/* Era: chevron expands the set list, the label goes to /sets#era */}
                  <div className="group flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-surface2">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={eraOpen}
                      aria-label={`${eraOpen ? "Collapse" : "Expand"} ${era.name} sets`}
                      className="rounded p-1 text-mut hover:text-ink"
                    >
                      <Chevron open={eraOpen} />
                    </button>
                    <Link href={`/sets#${era.id}`} className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: era.accent }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium group-hover:text-ink">
                            {era.name}
                          </span>
                          <span className="block text-[11px] tabular-nums text-mut">
                            {yearsOf(era.id) ? `${yearsOf(era.id)} · ` : ""}
                            {era.sets.length} sets
                          </span>
                        </span>
                      </span>
                    </Link>
                  </div>
                  {eraOpen ? (
                    <ul className="ml-4 space-y-0.5 border-l border-line pl-2">
                      {era.sets.map((s) => {
                        const active = pathname === `/sets/${s.slug}`;
                        return (
                          <li key={s.slug}>
                            <Link
                              href={`/sets/${s.slug}`}
                              className={`block truncate rounded-md px-2 py-1 text-[13px] ${
                                active
                                  ? "bg-surface2 font-semibold text-ink"
                                  : "text-mut hover:bg-surface2 hover:text-ink"
                              }`}
                              title={s.name}
                            >
                              {s.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <nav
        className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-6"
        aria-label="Dashboard and sets"
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
            Browse sets
          </p>
          <div className="space-y-1">
            {langBranch("en", "English Sets")}
            {langBranch("jp", "Japanese Sets")}
          </div>
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
