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
