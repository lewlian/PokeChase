"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SearchBox } from "./SearchBox";

const NAV = [
  ["/sets", "Sets"],
  ["/movers", "Movers"],
  ["/learn", "Learn"],
] as const;

function Pokeball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--poke-red)" />
      <path d="M2 12a10 10 0 0 0 20 0H2Z" fill="#fff" />
      <path d="M2 12h20" stroke="#1c2033" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" fill="#fff" stroke="#1c2033" strokeWidth="2" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  // Collapse the mobile search row whenever navigation happens.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Pokeball className="h-6 w-6" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Poké<span className="text-pokeblue">Chase</span>
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm font-medium [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 sm:px-3 ${
                  active
                    ? "bg-surface2 text-ink"
                    : "text-mut hover:bg-surface2 hover:text-ink"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden sm:block">
          <SearchBox />
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-expanded={searchOpen}
          aria-controls="mobile-search"
          aria-label={searchOpen ? "Close search" : "Open search"}
          className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:hidden ${
            searchOpen ? "bg-surface2 text-ink" : "text-mut hover:bg-surface2 hover:text-ink"
          }`}
        >
          {searchOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          )}
        </button>
      </div>

      {searchOpen ? (
        <div id="mobile-search" className="border-t border-line px-3 pb-3 pt-2 sm:hidden">
          <SearchBox fullWidth autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      ) : null}
    </header>
  );
}
