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
