# QA Report — v1 one-shot build (2026-07-30)

## Automated

| Suite | Result |
|---|---|
| Unit tests (`npm test`) — era mapping (50 real set names), sealed classification (24 product names), chase tiering (6 scenarios), formatters | **92/92 pass** |
| TypeScript (`tsc --noEmit`) | clean |
| ESLint (`src`, `scripts`, `tests`, max-warnings 0) | clean |
| Production build (`next build`) | succeeds, all 16 routes |
| Route smoke suite (`scripts/qa-smoke.ts`) — home, sets index, 5 random set pages × 3 tabs, card/product detail, movers, search (hit + miss), learn ×4, 404s ×3, API ×3 incl. bad input | **29/29 pass** |

## Data verification

- 217 sets · 27,784 cards · 4,735 sealed products ingested from TCGCSV.
- 3.48M price snapshots across **79 dates spanning 2025-07-31 → 2026-07-30**
  (daily for last 30 days, weekly earlier).
- 7,576 chase-ranked cards with 7d/30d deltas; spot-checked against reality:
  Base Set (Shadowless) Charizard $10,000 grail; Evolving Skies Umbreon VMAX
  alt art $2,404 (rank #1, 1Y chart $1.37k → $2.40k); Evolving Skies booster
  box $2,519 ($69.99/pack).
- Re-running any ingest job produces zero duplicate rows (upsert-by-key).
- 0 broken images found (94 TCGdex logos matched; all others render styled
  fallbacks; card scans come from the TCGplayer CDN).

## Browser verification (Chrome pane, dev server)

- **Home**: hero stats, era timeline, top-chase grid with images, 7-day
  gainers/losers, newest sets (verified the bogus-date guard: shows 2026 Mega
  Evolution sets, not mis-dated POP promos).
- **Set pages**: all 3 tabs; chase grid with GRAIL holo-ring animation and tier
  badges; card-number/price/name sorting; sealed tab grouped by product type
  with $/pack and "What's inside" accordions.
- **Card page**: full-res scan, variant price table, chart range buttons
  (30D/90D/1Y/All) switch correctly against real history.
- **Glossary**: client-side filter verified ("slab" → 2/78).
- **Responsive**: mobile (375px) — no horizontal overflow, nav collapses.
- **Theming**: light and dark schemes both verified via token flip.
- **Console**: zero errors/warnings across every page visited.

## Fixed during QA

1. Archive backfill returned HTTP 401 for all dates — host requires a
   User-Agent header; added one (78/78 dates then loaded).
2. "Newest sets" showed vintage POP/promo sets with bogus 2026 catalog dates —
   added era-window guard to the query.
3. Set-logo fallback chip overflowed on long names — truncation added.
4. Near-zero deltas rendered as red "▼ 0.0%" — now neutral "·".
5. TS type conflict in `erasWithSets` row typing; ESLint `no-img-element`
   (deliberate `<img>` for CDN images) codified in config.

## Known cosmetic notes

- The in-app browser's screenshot capture produced blank frames when scrolled
  mid-page; DOM inspection confirmed layout is correct (tool artifact, not an
  app bug — full-height captures render perfectly).
- Movers can surface cheap volatile items (e.g. energy cards ≥$5); a higher
  floor is one query param away if it annoys.

## Scheduled refresh

`com.pokechase.daily` LaunchAgent installed and loaded (14:05 local daily);
verified present via `launchctl list`. Manual pipeline run end-to-end exit 0.

## Addendum — ask table & sales links (2026-07-30)

- Added "Market vs. current asks" table (best ask / ask-vs-market % / direct
  ask / mid / high per variant) to card and sealed product pages, sourced from
  existing daily snapshots, plus "View latest sales on TCGplayer" outbound
  links. Verified in-browser (Umbreon VMAX: ask $1,998.67 = −16.9% vs market),
  zero console errors; 94/94 unit tests; smoke suite extended to assert the new
  section — 29/29.

## Addendum — official sealed contents & layout (2026-07-30)

- Sealed products now store the official TCGplayer product description
  (TCGCSV `CardText`); a tested parser extracts the "includes:" bullet lists.
  Coverage: 4,063/4,735 products have descriptions; 1,377 parse to complete
  official lists (marked "✓ Official contents", incl. guaranteed promos like
  the Pokémon Center ETB's logo-stamped Eevee). Prose-style older descriptions
  fall back to labeled templates, with the official blurb shown on product
  pages. Sealed tab redesigned: contents always visible (no collapse),
  horizontal cards, 2-col grid. 100/100 unit tests (6 new parser tests),
  29/29 smoke, zero console errors, browser-verified.

## Addendum — search typeahead + Learn visuals (2026-07-30)

- Header search: sample queries on focus; debounced live results (sets/cards/
  sealed, thumbnails + prices) as you type; ArrowUp/Down + Enter navigation
  verified via DOM automation; /api/v1/search endpoint added (smoke 31/31).
- Learn guides now embed live visuals: median-priced rarity ladder (real
  cards — switched from top-priced after QA caught an $819 outlier common
  contradicting the lesson), alt-art showcase, Umbreon character-collection
  gallery, current-set sealed lineup with $/pack, CSS grading-scale and
  centering diagrams, protection ladder, and a live embedded price chart of
  the current #1 chase card. Glossary: 8 visual rarity terms now show a real
  tappable example card. All server-rendered from the live DB; zero console
  errors; 100/100 unit tests.

## Addendum — raw vs. graded market (2026-07-30)

- Card pages now have a "Raw vs. graded market" section. TCGplayer is
  raw-only, so graded data (Ungraded, Grades 7–9.5, PSA 10, BGS 10, CGC 10,
  SGC 10) comes from the PriceCharting API — field→grade mapping taken from
  their official docs; ingest is token-gated (PRICECHARTING_TOKEN), respects
  the 1 req/sec limit, refreshes chase-tier cards ~weekly, and stores only
  matches passing a card-number sanity check. Without a token the section
  shows the raw baseline, grading education, and prefilled eBay-solds +
  PriceCharting comp links per card. Both render paths verified (populated
  path via temporary TEST rows, deleted after). 107/107 unit tests,
  31/31 smoke, token-less pipeline step exits cleanly.

## Addendum — Japanese Mega-era sets / Storm Emeralda watch (2026-07-31)

- User asked to capture "Storm Emeralda" (released in Japan today). Research:
  it is the Japanese M6 set; TCGplayer had not listed it yet at build time
  (M2–M6a were listed). Added a JP sync job (TCGplayer category 85) watching
  /^M\d/ groups: all 8 existing JP Mega-era sets ingested (m1L/m1S, M2, M2a,
  M3, M4, M5, M6a — 1,142+ cards, sealed, prices, contents, chase) with
  language='jp' and JAPANESE badges in the UI. M6: Storm Emeralda will be
  captured automatically by the daily pipeline the day TCGplayer lists it;
  the English "Delta Reign" (Nov 6) is covered by the existing EN sync.
- Fixed during QA: sets.language column was missing from the original
  migration (silently dropped); chase compute now uses per-card latest
  snapshots within a 3-day window instead of one global date (a partial
  ingest had briefly wiped EN rankings — restored: 7,726 chase rows, 215
  sets, incl. 140 JP). 111/111 unit tests, 31/31 smoke.

## Addendum — EN/JP language chips (2026-07-31)

- Added a LangChip (EN = blue outline, JP = solid red) to every
  mixed-language surface: search page (sets/cards/sealed), search typeahead
  dropdown, movers (home + /movers), "Biggest chase cards" tiles, newest
  sets, and Learn-hub card galleries; CardTile accepts a language prop and
  the compact search API returns language per row. Verified live: "mega
  darkrai" search shows JP gold $479.75 chipped beside EN gold $194.81.
  111/111 unit tests, 31/31 smoke, zero console errors.

## Addendum — sidebar navigation + search readability (2026-07-31)

- New persistent left panel (desktop): "Dashboard" tab (active-state
  highlighted) + full browse-by-era list with accent dots and set counts +
  "All sets" link. Home page stays the dashboard (top chase, movers, newest);
  its horizontal era strip is now mobile-only. Search typeahead widened to
  min(92vw, 34rem) and all truncation removed from typeahead rows, card
  tiles, and search sealed rows — long names wrap fully. Verified live
  (long ETB product names fully readable); production build clean,
  31/31 smoke, 111/111 unit tests, zero console errors. Also observed the
  14:05 daily LaunchAgent ran autonomously today: stats advanced to 225
  sets / 28,926 cards / 3.53M price points, "updated Jul 31".

## Addendum — Railway deployment prep (2026-07-31)

- Added railway.json (migrate-on-boot start command, /api/v1/meta
  healthcheck), in-app daily-ingest scheduler via Next instrumentation
  (ENABLE_DAILY_INGEST=1, fires 21:05 UTC, spawns the pipeline in the web
  service so it shares the volume-mounted DB), ingest:bootstrap one-shot
  script, 7-Zip binary detection (7zz/7z/7za) so the history backfill works
  on Linux containers, tsx moved to runtime deps, and DEPLOY.md walkthrough.
  Verified: production build clean, and a real boot test with the flag set —
  server Ready, API 200, "[ingest-scheduler] next daily ingest at
  2026-07-31T21:05:00Z" logged. 111/111 tests.

## Addendum — accounts, market screener, watchlists & portfolio (2026-08-02)

- **Market views (Phase A):** /market screener over all 28.9k cards — best
  variant priced at the latest snapshot, variant-consistent 7d/30d changes
  via anchor-date self-joins (movers pattern; never a per-row correlated
  subquery), min-price/era/language filters, 50-row pagination, inline-SVG
  sparklines. Set pages gained a Grid/Table toggle (+7d/30d sorts).
  Verified live against the full DB: 16,762 cards ≥$1, top gainers sorted
  +245.5% with matching green sparklines, JP filter isolates M-series,
  375px shows no horizontal overflow (table scrolls in its own container).
- **Auth (Phase B):** Supabase email/password + Google (Apple = one array
  entry + dashboard config later). Next 16 proxy.ts refreshes sessions and
  gates /portfolio, /watchlists, /account (verified: 307 →
  /login?next=%2Fportfolio signed out; public routes 200; unreachable or
  unconfigured Supabase degrades to signed-out, never crashes; builds pass
  with and without env vars). Dockerfile ARGs inline NEXT_PUBLIC_* at build.
- **Watchlists (Phase C):** multiple named lists (lazy-created default),
  per-variant items, /api/v1/me/* route handlers (401 signed out, 503
  unconfigured, 400 on invalid input incl. malformed JSON, 409 duplicate
  name), card-page star picker + owned-qty stepper, search-to-add.
  batchCards/sparklinesFor are (product, variant)-keyed so the same card in
  two variants stays two rows.
- **Portfolio (Phase D):** value-only dashboard — total, 1d/7d/30d chips,
  retroactive value-over-time chart computed on the fly from
  price_snapshots (forward-filled union of dates; disclaimed in the UI),
  holdings table with qty steppers and per-row value.
- **Cleanup (Phase E):** dropped the dormant v1 placeholder tables
  (users/collection_items/portfolio_snapshots) via drizzle migration 0004 —
  user data lives in Supabase (supabase/migrations/0001_user_data.sql, RLS
  owner-only, no service-role key anywhere).
- Tests: 181/181 unit+integration (first DB-backed fixture:
  tests/helpers/db.ts spins a migrated throwaway SQLite; route handlers
  tested against a mocked Supabase client). Smoke: 39/39 (added /market,
  set table view, /login, and 401/503 checks on /api/v1/me/*). Typecheck,
  lint, and production builds clean. Zero console errors on new pages.
- Deferred until the Supabase project exists (owner setup checklist in
  docs/PLAN-accounts-market-portfolio.md): live signup/login/Google OAuth
  E2E, the two-account RLS isolation test, and signed-in
  watchlist/portfolio UI verification in production.

## Addendum — live auth/RLS verification on production (2026-08-03)

Supabase project connected (URL + publishable key as Railway build args and
.env.local; confirm-email off; Google provider configured). Verified against
https://pokechase.up.railway.app:

- **Auth:** email signup returns a session immediately; avatar menu +
  session-gated sidebar appear; sign-out clears; sign-in honours
  `?next=` (landed on /watchlists). Gated routes 307 to
  `/login?next=…`; public routes unaffected (/market 200).
- **RLS two-account attack (accounts A and B, B's real JWT vs A's rows):**
  list/read of A's watchlists, watchlist_items, portfolio_items → `[]`;
  read of A's watchlist by exact UUID → `[]`; INSERT into A's watchlist →
  **403 RLS violation**; DELETE of A's watchlist and PATCH of A's portfolio
  quantity → 200 with **0 rows affected**. A's data byte-identical after.
  App API: every /api/v1/me/* method → 401 without a session.
- **Watchlists:** default list lazily created once; create trims whitespace
  (201), duplicate name 409, empty name 400; add is idempotent; rename OK;
  delete OK.
- **Portfolio:** 2 × Latias & Latios GX → total $7,020.34 (= 2 × $3,510.17,
  hand-checked against the card page); 1d/7d/30d chips populated; value
  chart renders with the retroactive-history disclaimer; qty 0 removes.
- **Bug found and fixed (800d948):** cards saved without an explicit variant
  default to `Normal`, but many cards only print Holofoil/Reverse Holofoil —
  those rows rendered as em-dashes. batchCards/sparklinesFor now fall back to
  the best-priced variant and label the row with the variant used. Verified
  live: Chansey 113/165 shows $1.40 · ▼5.4% 7d · ▲2.9% 30d · sparkline ·
  "Reverse Holofoil". 195/195 unit+integration tests (incl. a regression
  test for this case).
- QA data removed afterwards; QA accounts remain in Supabase Auth for the
  owner to delete.

## Addendum — full Japanese catalog (2026-08-04)

- Ingested all 454 TCGplayer Pokemon-Japan (category 85) sets — 1996
  Expansion Pack through M6a — with a 1-year price backfill (78 archive
  dates, 1,970,777 JP rows) and the same nightly refresh as English.
  Production: 671 sets / 57,828 cards / 5.6M snapshots; chase pool 13,899
  (EN+JP). Fixed en route: JP era prefixes + vintage-promo catalog-date
  misfiles (remap-eras.ts re-applies rules), JP/EN slug collisions (-jp
  suffix), and unnumbered 1996-98 JP cards misclassified as sealed
  (isCard now keys on CardType; sync drops stale cross-table twins).
  Verified live: Expansion Pack shows 102 cards with the $800 unnumbered
  Charizard; "pikachu 227" surfaces the JP 227/S-P at $1,799 beside the EN
  print at $1,600, chipped by language. Chinese: no price source exists
  (TCGplayer has no CN category; TCGdex zh is catalog-only) — deliberately
  not ingested.
