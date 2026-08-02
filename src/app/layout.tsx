import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { eraSummaries } from "@/lib/queries";
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

// The sidebar queries the DB, which doesn't exist in build containers —
// render everything per-request (queries are sub-ms against local SQLite).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "PokéChase — Pokémon TCG chase cards & prices", template: "%s · PokéChase" },
  description:
    "Every Pokémon TCG set since 1999: chase cards, daily market prices, sealed product values, and a full collecting guide.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const eras = eraSummaries();
  return (
    <html lang="en" className={`${fredoka.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />

        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
          <Sidebar eras={eras} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>

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
