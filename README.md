# PokéChase

A Pokémon TCG collector's dashboard: every English set since 1999, each set's
**chase cards** ranked by market value, **sealed product** prices with
what's-inside breakdowns, **daily-refreshed** TCGplayer market prices with a
year of price history, and a **Learn** hub (78-term glossary + 7 guides).

> Fan-made price guide. Not affiliated with Nintendo, Creatures, GAME FREAK, or
> The Pokémon Company. Card images © their owners, used for identification only.
> Prices are informational — not financial advice.

## Quick start

```bash
npm install
npm run db:migrate          # create data/pokechase.db schema
npx tsx scripts/ingest-catalog.ts    # ~2 min: 217 sets, ~28k cards, ~4.7k sealed
npx tsx scripts/ingest-prices.ts     # today's snapshot (~45k price rows)
npm run ingest:contents && npm run ingest:logos
npm run ingest:backfill     # ~1 year of daily/weekly history (~3.4M rows, ~10 min)
npm run ingest:chase        # rank chase cards + compute deltas
npm run dev                 # http://localhost:3000
```

## Data sources

| Source | Used for | Notes |
|---|---|---|
| [TCGCSV](https://tcgcsv.com) | Canonical catalog + prices for singles **and** sealed (mirrors TCGplayer, refreshes ~20:00 UTC) | Free; archives back to Feb 2024 power the history backfill |
| TCGplayer CDN | Official card/product scans (`_400w`, `_in_1000x1000`) | Every card has an image |
| [TCGdex](https://tcgdex.dev) | Set logos (best-effort name match) | Unmatched sets get a styled fallback |

The original plan targeted pokemontcg.io as primary; it was returning ~50%
HTTP 500s at build time, so TCGCSV (one consistent source where catalog,
prices, and images join by `productId`) became primary. pokemontcg.io can be
re-added later as an enricher.

## Daily refresh

`scripts/install-daily-refresh.sh` installs a LaunchAgent
(`com.pokechase.daily`) that runs the full pipeline every day at **14:05 local**
(after TCGCSV's ~20:00 UTC update): catalog → prices → contents → chase → logos.
Logs land in `data/logs/daily.log`; every run is recorded in the `job_runs`
table.

Uninstall:

```bash
launchctl unload ~/Library/LaunchAgents/com.pokechase.daily.plist
rm ~/Library/LaunchAgents/com.pokechase.daily.plist
```

## Architecture

- **Next.js 16** (App Router, TypeScript, Tailwind v4) — server components query
  SQLite directly; pages are dynamic so daily data is always current.
- **SQLite + Drizzle** (`data/pokechase.db`, WAL). Schema is portable to
  Postgres when accounts/portfolio (v2) land — the `users`,
  `collection_items`, and `portfolio_snapshots` tables are already migrated.
- **Ingestion** = idempotent CLI jobs under `scripts/` (safe to re-run; unique
  `(product, variant, date)` snapshots; `job_runs` observability).
- **Chase tiers** (`src/lib/chase.ts`): per set — Grail = top-3 and ≥$100,
  Chase = top-10 or ≥$30, Notable = top-20 or ≥$15, with a manual
  `chase_overrides` table.

### Routes

`/` dashboard · `/sets` era explorer · `/sets/[slug]` (chase / all cards /
sealed tabs) · `/cards/[id]` price chart + variants · `/products/[id]` contents
+ per-pack comparison · `/movers` 7-day gainers/losers · `/search` ·
`/learn`, `/learn/glossary`, `/learn/[guide]` · JSON API:
`/api/v1/history/[id]`, `/api/v1/meta`.

## Testing

```bash
npm test                      # 92 unit tests (era mapping, classification, tiering, formats)
npm run typecheck && npx eslint src scripts tests
npx tsx scripts/qa-smoke.ts http://localhost:3000   # 29 route checks vs live server
```

## Known limitations (v1)

- Sealed "what's inside" lists are era-aware **templates** per product type
  (flagged "typical contents" in the UI) — verified per-product contents can be
  added via the `sealed_contents.verified` flag.
- Old promo groups (POP Series, etc.) carry TCGplayer catalog dates rather than
  true release dates; the UI guards against this where it matters (newest sets).
- History depth is ~1 year (TCGCSV archives) and grows daily; graded-card
  (PSA/BGS) prices are out of scope until a PriceCharting integration.
