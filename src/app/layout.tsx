import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "PokéChase — Pokémon TCG chase cards & prices", template: "%s · PokéChase" },
  description:
    "Every Pokémon TCG set since 1999: chase cards, daily market prices, sealed product values, and a full collecting guide.",
};

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
            <Link href="/" className="flex items-center gap-2">
              <Pokeball className="h-6 w-6" />
              <span className="font-display text-lg font-semibold tracking-tight">
                Poké<span className="text-pokeblue">Chase</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {[
                ["/sets", "Sets"],
                ["/movers", "Movers"],
                ["/learn", "Learn"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-3 py-1.5 text-mut hover:bg-surface2 hover:text-ink"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <form action="/search" className="ml-auto hidden sm:block">
              <input
                type="search"
                name="q"
                placeholder="Search cards & sets…"
                aria-label="Search cards and sets"
                className="w-56 rounded-full border border-line bg-bg px-4 py-1.5 text-sm outline-none placeholder:text-mut focus:border-pokeblue"
              />
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-line bg-surface py-6 text-center text-xs text-mut">
          <div className="mx-auto max-w-4xl space-y-2 px-4">
            <p>
              PokéChase is a fan-made price guide. Not affiliated with, endorsed, or
              sponsored by Nintendo, Creatures, GAME FREAK, or The Pokémon Company.
              Card images are the property of their respective owners and are used for
              identification purposes only.
            </p>
            <p>
              Prices are TCGplayer market estimates refreshed daily — for information
              only, not financial advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
