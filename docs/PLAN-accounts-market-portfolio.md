# PokeChase v2: Accounts, Market View, Portfolio & Watchlists

## Context

PokeChase (Next.js 16 + SQLite/Drizzle on Railway, live at pokechase.up.railway.app) has no user accounts today. Sean wants three features, spec'd as an agent-executable implementation doc with full test coverage:

1. **Auth** — email/password + Google via **Supabase** (Apple later; build so it's config-only to add).
2. **Compact market view** — stock-market-style card tables: a grid/table toggle on every set page **and** a global `/market` screener (sortable price / % change columns, sparklines).
3. **Portfolio & watchlists** — **value-only** portfolio (quantity per card, no cost basis), multiple named custom watchlists, dashboard with total value + change over time + per-card sparklines/deltas.

Latest origin/main commit `efef742` (from mobile Claude) is a mobile-friendliness pass: new **`src/components/SiteHeader.tsx`** client component (desktop pill search + mobile search toggle, scrollable nav), explicit `grid-cols-1` bases to fix horizontal overflow, swipeable set tabs. Local checkout is 1 commit behind — **implementation step 0 is `git pull`**.

### Verified facts that shape the design
- Catalog+prices stay in SQLite (565 MB Railway volume): 28,926 cards / 225 sets / 3.5M `price_snapshots` UNIQUE(product_id, sub_type, date), indexes on (product_id,date) and (date). Last 30+ days fully dense daily (~45k rows/day) → exact-date 7d/30d anchors and 30d sparkline windows are safe.
- All reads synchronous better-sqlite3 via server-only `src/lib/queries.ts`. `movers()` (queries.ts:339) self-join is the template for all-cards % change — do NOT use the correlated-subquery-per-row pattern over 28k cards.
- `chase_current` deltas cover only ~7,700 cards; all-card views need new queries.
- No middleware/auth/Supabase code anywhere. Existing API routes: `/api/v1/{meta,search,history/[id]}`. SQLite has dormant EMPTY v2 tables (`users`, `collection_items`, `portfolio_snapshots`) superseded by this design.
- UI conventions: URL-state Link pills (`?tab=&sort=`), `Delta.tsx` (text-gain/text-loss ▲/▼ tabular-nums), `format.ts` money/pct, movers rows = the stock-row model, recharts already a dep (too heavy per-row → inline SVG sparklines), Tailwind v4 tokens + auto dark mode. No loading.tsx/skeletons yet — new pages establish the pattern.
- **AGENTS.md hard rule:** read `node_modules/next/dist/docs/` before App Router/route-handler/middleware/cookies code. Known Next 16 traps: async `params`/`searchParams`/`cookies()`; the middleware file convention changed (middleware → proxy) — **verify filename/API in bundled docs before creating it** (written as "proxy/middleware" below).
- Railway: Dockerfile build, auto-deploy on push, healthcheck `/api/v1/meta`. `NEXT_PUBLIC_*` vars are build-time-inlined → Dockerfile needs ARGs.

### User decisions
- Portfolio **value-only** (quantity, no cost basis).
- **Google + email/password now; Apple later** (config-only addition).
- Market view = **set-page toggle AND global screener**.
- Email confirmation **OFF for v1** (recommendation: no SMTP dependency/signup friction; dashboard toggle, can flip on later — the callback route already handles the confirm-redirect shape).

## Architecture

Two data planes composed per-request in async server components:
- **Catalog/prices (existing):** SQLite, sync reads; extended with new queries in `src/lib/queries-market.ts`.
- **User data (new):** Supabase Postgres (`watchlists`, `watchlist_items`, `portfolio_items`) with owner-only RLS, accessed via `@supabase/ssr` server client using the **user JWT — no service-role key** (RLS is the enforcement; omitting the key removes an attack surface).

Pages read Supabase first (async → productId/subType refs), then SQLite (sync → prices/metadata/sparklines) via batch queries. Root layout is already `force-dynamic`, so per-request session reads compose cleanly. Portfolio value history is **computed on the fly** (no snapshot job): ≤200 holdings × ≤80 dates against the (product_id,date) index is a few thousand rows. **Accepted tradeoff, stated in UI copy:** the chart shows "value of your *current* collection over time" (retroactive, not transactional).

## Supabase design

**Clients** in `src/lib/supabase/`:
- `client.ts` — `createBrowserClient` (auth UI, OAuth redirect).
- `server.ts` — `getServerSupabase()` via `createServerClient` + `await cookies()`; **returns `null` when env vars unset** (graceful signed-out fallback so dev/build without Supabase never crashes — mirrors `eraSummaries()` tolerance). `getUser()` helper always calls `supabase.auth.getUser()` (never trust `getSession()` alone).
- `middleware.ts` — session-refresh helper consumed by the root proxy/middleware file.

**Auth surfaces:** `/login` (sign-in/sign-up tabs + Google button driven by `OAUTH_PROVIDERS = [{ id: "google", label: "Continue with Google" }]` — Apple = one array entry + dashboard config later), `/auth/callback/route.ts` (`exchangeCodeForSession` → redirect to validated same-origin `next`), `/auth/signout/route.ts` (POST), `/account` page.

**Gating (proxy/middleware):** session refresh on all non-static paths; redirect `/portfolio`, `/watchlists/:path*`, `/account` → `/login?next=<path>` when signed out; `/api/v1/me/*` returns 401 JSON. Public pages untouched.

**SQL migration** — committed at `supabase/migrations/0001_user_data.sql`, user pastes into Supabase SQL editor (no CLI toolchain):

```sql
create table public.watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create unique index watchlists_one_default_uq on public.watchlists (user_id) where is_default;
create index watchlists_user_idx on public.watchlists (user_id);

create table public.watchlist_items (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  product_id   integer not null,
  sub_type     text not null default 'Normal',
  added_at     timestamptz not null default now(),
  primary key (watchlist_id, product_id, sub_type)
);

create table public.portfolio_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id integer not null,
  sub_type   text not null default 'Normal',
  quantity   integer not null check (quantity between 1 and 9999),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id, sub_type)
);

alter table public.watchlists      enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolio_items enable row level security;

create policy "own watchlists" on public.watchlists
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own watchlist items" on public.watchlist_items
  for all using (exists (select 1 from public.watchlists w
                         where w.id = watchlist_id and w.user_id = (select auth.uid())))
  with check   (exists (select 1 from public.watchlists w
                         where w.id = watchlist_id and w.user_id = (select auth.uid())));
create policy "own portfolio" on public.portfolio_items
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

Key modeling calls: **portfolio is a separate table** (quantity semantics ≠ watchlist); **sub_type stored on both** (default `'Normal'` — Holofoil vs Normal prices differ enormously); default watchlist created **lazily app-side** (first `GET /api/v1/me/watchlists` inserts `("Watchlist", is_default=true)` if none — no auth trigger).

**Dormant SQLite v2 tables: DROP via migration 0004** (Phase E). They're empty, their cost-basis/snapshot design contradicts the decided model, and two competing user-data schemas would mislead future agents. Remove from `schema.ts`, `npm run db:generate` → `drizzle/0004_*.sql`; self-migration applies on deploy harmlessly.

## Mutations: route handlers (not server actions)

Matches existing `/api/v1` style, testable with a mocked Supabase client, called from small client components (SearchBox fetch pattern: debounce/AbortController where relevant). All use `getServerSupabase()` + a `requireUser()` helper → 401 JSON; `user_id` never taken from the request body (RLS enforces anyway).

| Route | Methods |
|---|---|
| `/api/v1/me/watchlists` | GET (list + counts; lazily creates default), POST (create, name validation) |
| `/api/v1/me/watchlists/[id]` | PATCH (rename), DELETE |
| `/api/v1/me/watchlists/[id]/items` | PUT `{productId, subType}` upsert, DELETE |
| `/api/v1/me/portfolio` | GET (holdings), PUT `{productId, subType, quantity}` (qty 0 deletes) |
| `/api/v1/me/card-state/[productId]` | GET → `{ inWatchlists: [ids], ownedQty }` (hydrates card-page buttons) |

## New SQLite queries (`src/lib/queries-market.ts`, server-only, raw-sql style)

Shared anchors: `latest = latestSnapshotDate()`, `d7 = max(date) <= latest−6d`, `d30 = max(date) <= latest−29d`. Shared **best-variant CTE** (window fns fine — better-sqlite3 bundles modern SQLite):

```sql
with best as (
  select product_id, sub_type, market as cur from (
    select product_id, sub_type, market,
           row_number() over (partition by product_id order by market desc) rn
    from price_snapshots where date = :latest and market is not null
  ) where rn = 1
)
```

Best variant = **sub_type with highest market at latest date**; 7d/30d change computed against *that same sub_type* at the anchor dates (variant-consistent, unlike movers' max/max); null pct when anchor row missing.

- **`cardsForSetWithChange(groupId)`** — `best` ⋈ `cards where group_id=:g`, left-join `price_snapshots` at `(product_id, sub_type, :d7/:d30)`, pct in SQL. Sparklines via second query: snapshots for the set's ids ⋈ `best` on (product_id, sub_type), `date >= date(:latest,'-29 days')`, grouped in JS to `number[]` per product (~250×30 = 7.5k rows).
- **`marketScreener(opts)`** — `{ sort: "price"|"d7"|"d30"|"name", dir, page (50/page), minPrice=1, eraId?, lang?, groupId?, rarity? }` + total-count query. Same shape over all cards, `cur >= :minPrice` + filters; `order by` from a whitelist map built by pure exported **`buildScreenerOrder()`** (unit-testable, no user-input interpolation); nulls-last pct sorts. Sparklines only for the 50 visible rows via `batchCards`. One windowed pass over the latest date's ~45k rows + indexed joins.
- **`batchCards(refs: {productId, subType?}[])`** — metadata (cards ⋈ sets), price at latest for the given subType (fallback to best variant), d7/d30 pct, 30d sparkline series; `IN` lists chunked at 500. Used by watchlist pages, portfolio holdings, screener sparklines.
- **`priceSeriesFor(refs, since?)`** — `select product_id, sub_type, date, market from price_snapshots where product_id in (...) and market is not null [and date >= :since] order by date asc` — feeds portfolio history.

**Portfolio aggregation** in pure `src/lib/portfolio.ts`: sorted union of dates, per-(productId,subType) forward-fill of last-seen price (holdings with no data yet contribute 0), `value(date) = Σ qty × price`; change chips compare latest vs nearest date ≤ latest−1/−7/−30d.

## UI inventory

- `src/lib/sparkline.ts` (pure path math: normalize, flat→midline, <2 points→null) + `src/components/Sparkline.tsx` — server-renderable `<svg viewBox="0 0 80 24"><polyline/></svg>`, stroke `var(--gain)`/`var(--loss)`/muted by trend, no gradients (no id collisions).
- `src/components/CardsTable.tsx` — shared stock-rows table (thumb ~h-12 w-9 like movers, name/number/set + LangChip, price tabular-nums, 7d + 30d `Delta`, sparkline, optional trailing slot for qty stepper / remove). Reused by: set table view, `/market`, `/watchlists/[id]`, `/portfolio`.
- **Set page** (`src/app/sets/[slug]/page.tsx`): `?view=grid|table` Link pills beside sort pills (extend searchParams); table branch uses `cardsForSetWithChange` and adds `sort=d7|d30`.
- **`/market`** — server page, URL state `?sort&dir&page&min&era&lang`, filter pills from `eraSummaries()`, pagination Links, clickable sortable column headers with arrow.
- **`/portfolio`** — big total value + 1d/7d/30d `Delta` chips, `PortfolioChart.tsx` (client recharts area modeled on `PriceChart.tsx`, range buttons), holdings `CardsTable` with `QtyStepper.tsx` client component (per-row value = qty × price), retroactive-history disclaimer.
- **`/watchlists`** (cards per list + create form) and **`/watchlists/[id]`** (CardsTable + rename/delete + add-via-search `AddCardSearch.tsx`, a trimmed SearchBox variant).
- **Card detail page:** `CardActions.tsx` client component — watchlist star with multi-list picker dropdown + "I own this" qty stepper, per-variant; hydrated from `/api/v1/me/card-state/`; signed out → link to `/login?next=/cards/{id}`.
- **Header:** post-pull the header is **`src/components/SiteHeader.tsx`** (client; desktop SearchBox slot at ~lines 67-69, mobile toggle after). `layout.tsx` reads session server-side and passes user (email/avatar) into `<SiteHeader user={...}>`; new `AuthButton.tsx` renders "Sign in" or avatar dropdown (Account, Portfolio, Watchlists, Sign out as POST form). Watch the two `ml-auto` elements on mobile — AuthButton should be `shrink-0` with the `ml-auto` moved to a wrapper. Add `/market` to the NAV array.
- **Sidebar.tsx:** takes `signedIn` prop from layout; "My Collection" group (Portfolio, Watchlists) above eras.
- **New pattern:** `loading.tsx` for `/portfolio`, `/watchlists`, `/watchlists/[id]`, `/market` + `Skeleton.tsx` (`bg-surface2 rounded motion-safe:animate-pulse`). Empty states in existing `border-line bg-surface p-6 text-mut` card style.

## Env / deploy

- `.env.example` (new): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` + existing vars documented (`POKECHASE_DB_PATH`, `ENABLE_DAILY_INGEST`, `PRICECHARTING_TOKEN`). Dev uses `.env.local` (verify `.gitignore` covers `.env*` — it does).
- **Dockerfile** (required — first NEXT_PUBLIC vars, inlined at build): before `RUN npm run build`:
  ```dockerfile
  ARG NEXT_PUBLIC_SUPABASE_URL
  ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
  ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
      NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
  ```
  Railway forwards service variables as build args when the Dockerfile declares matching ARGs. The `null` fallback in `getServerSupabase()` keeps builds green if absent.
- `package.json`: add `@supabase/supabase-js`, `@supabase/ssr`.

## Phases (each commit-able + verifiable; step 0 = `git pull`)

### Phase A — Market table views (no auth dependency; ships value immediately)
Create: `src/lib/sparkline.ts`, `src/components/Sparkline.tsx`, `src/lib/queries-market.ts` (anchors, best-variant CTE, all four queries, `buildScreenerOrder`), `src/components/CardsTable.tsx`, `src/app/market/page.tsx` + `loading.tsx`, `src/components/Skeleton.tsx`, `tests/helpers/db.ts` (in-memory better-sqlite3 + migrate from `./drizzle` + seed helpers — first DB-backed fixture), `tests/{sparkline,screener-params,queries-market}.test.ts`.
Modify: `src/app/sets/[slug]/page.tsx` (view toggle + table branch + d7/d30 sorts), `src/components/SiteHeader.tsx` (NAV + `/market`).
Verify: `npm test`, typecheck, lint, `next build`; dev-server spot-check `/market` sort/page/filter URLs + a large set (Evolving Skies) in both views.
Commit: `feat: market screener page and stock-style table view for sets`

### Phase B — Supabase auth skeleton
Create: `src/lib/supabase/{client,server,middleware}.ts`, proxy/middleware file (**read node_modules/next/dist/docs/ first — Next 16 renamed middleware→proxy**), `src/app/login/page.tsx` + client form, `src/app/auth/{callback,signout}/route.ts`, `src/app/account/page.tsx`, `src/components/AuthButton.tsx`, `.env.example`.
Modify: `package.json`, `Dockerfile` (ARGs), `src/app/layout.tsx` (session read → SiteHeader/Sidebar props), `src/components/SiteHeader.tsx` (AuthButton slot), `src/components/Sidebar.tsx` (gated links), gating in proxy/middleware.
Verify: typecheck/build **with and without** env vars; manual: email signup → session persists across reload; wrong-password error; Google OAuth round trip on localhost; `/portfolio` redirects signed-out with working `next=`.
Commit: `feat: Supabase auth (email/password + Google) with gated routes`
*(User completes manual checklist items 1–6 before end-to-end testing; code can be written first.)*

### Phase C — User data model + watchlists
Commit `supabase/migrations/0001_user_data.sql`; user runs it in the SQL editor. Create: the five `/api/v1/me/*` route handlers, `src/lib/user-data.ts` (typed Supabase queries + validation), `src/app/watchlists/page.tsx` + `[id]/page.tsx` + loading files, `src/components/{CardActions,AddCardSearch}.tsx`, `tests/{user-validation,api-me}.test.ts` (mocked Supabase client).
Modify: `src/app/cards/[id]/page.tsx` (mount CardActions with the page's variant list).
Verify: tests; manual CRUD via UI; RLS spot-check with a second account.
Commit: `feat: multiple named watchlists with per-variant items`

### Phase D — Portfolio dashboard
Create: `src/lib/portfolio.ts` (pure), `src/app/portfolio/page.tsx` + `loading.tsx`, `src/components/{PortfolioChart,QtyStepper}.tsx`, `tests/portfolio.test.ts`.
Modify: `CardActions.tsx` (owned-qty wiring).
Verify: tests; manual: add holdings, total = hand-computed Σ qty×price vs card pages, chart ranges, disclaimer visible.
Commit: `feat: value-only portfolio dashboard with computed history`

### Phase E — Polish, cleanup, QA
Modify: `src/db/schema.ts` (delete v2 tables) + `npm run db:generate` → `drizzle/0004_*.sql`; empty/error-state audit; mobile pass (375px) on all new pages; QA.md addendum executed + appended; extend `scripts/qa-smoke.ts` with `/market`, `/login`, 401 checks on `/api/v1/me/*`.
Verify: full suite + smoke + manual checklist; push → Railway deploy → re-verify auth in production (redirect URLs!).
Commit: `chore: drop dormant v2 tables, QA pass for auth/market/portfolio release`

## Test cases

**Unit (vitest, pure):**
- U1–U6 `sparkline.ts`: normal series path; flat → midline; empty/1-point → null; two points; extreme-range normalization; trend classification at ±0.05%.
- U7–U14 `portfolio.ts`: single-holding series; multi-holding sum; forward-fill gaps; late-starting holding contributes 0 then joins; qty multiplication; 1d/7d/30d picks nearest anchor ≤ target; empty holdings → empty; same product in two variants summed separately.
- U15–U19 `buildScreenerOrder`/params: each sort key → expected fragment; unknown sort → default; dir whitelist; page/min clamps; injection-shaped input rejected.
- U20–U22 watchlist name validation: trims; rejects empty / >40 chars; allows unicode.

**DB integration (in-memory SQLite fixture):**
- D1 best-variant: Holofoil $50 vs Normal $5 → Holofoil chosen; d7 compared holo-to-holo.
- D2 `cardsForSetWithChange` pct exact; missing d7 anchor → null pct.
- D3 sparkline series ordered asc, best variant only, last 30d only.
- D4–D8 `marketScreener`: minPrice; sort price/d7/d30 asc+desc nulls-last; pagination offset + total count; era filter; lang filter.
- D9 `batchCards`: explicit subType priced from that variant; unknown id omitted; >500-id chunking.
- D10 `priceSeriesFor`: respects `since`; excludes null market.

**Route handlers (mocked Supabase client):**
- R1 every `/api/v1/me/*` method → 401 without user.
- R2 GET watchlists lazily creates default exactly once.
- R3 POST watchlist: 201; duplicate name → conflict error; invalid name → 400.
- R4 PUT item upsert idempotent; DELETE removes.
- R5 portfolio PUT qty 3 upserts; qty 0 deletes; −1/10000 → 400.
- R6 malformed JSON → 400 not 500.

**Manual QA (append to QA.md, existing table style):** signup + immediate session; logout/login; wrong-password message; Google OAuth on localhost AND production; session survives reload/restart; gated routes redirect with working `next=`; **RLS two-account test — user B cannot see or mutate user A's data via UI or direct fetch to `/api/v1/me/*`**; watchlist create/rename/delete incl. default; add/remove from card page and from watchlist search; multi-watchlist star state; qty stepper edits + delete-at-zero; portfolio total hand-verified; chart ranges; retroactive disclaimer visible; `/market` sorting both directions, pagination, min-price + era filters, sparkline direction matches Delta sign; set grid↔table toggle preserves tab/sort; 375px no overflow on all new pages; dark-mode token check; zero console errors.

## Sean's one-time manual setup (not agent-executable)

1. Create Supabase project (US West, near Railway) → copy Project URL + anon key.
2. Auth → Sign In/Providers → Email: enable; **"Confirm email" OFF** (v1 decision).
3. Google Cloud Console → OAuth consent screen (External) → OAuth Client ID (Web app) → redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Supabase → Auth → Providers → Google: enable, paste client ID + secret.
5. Supabase → Auth → URL Configuration: Site URL `https://pokechase.up.railway.app`; additional redirects `http://localhost:3000/auth/callback`, `https://pokechase.up.railway.app/auth/callback`.
6. Local `.env.local` from `.env.example` with the two values.
7. After Phase C: run `supabase/migrations/0001_user_data.sql` in the SQL editor; confirm 3 tables show RLS shields.
8. Railway → Variables: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; redeploy.
9. (Later, Apple) Apple Developer account + enable Apple provider in Supabase + add `{ id: "apple" }` to `OAUTH_PROVIDERS` — no other code.

## Critical files
- [src/lib/queries.ts](src/lib/queries.ts) — patterns to extend; `movers()` at :339 is the screener template
- [src/components/SiteHeader.tsx](src/components/SiteHeader.tsx) (origin/main) — NAV array + AuthButton slot after desktop SearchBox
- [src/app/layout.tsx](src/app/layout.tsx) — force-dynamic session read, props to SiteHeader/Sidebar
- [src/app/sets/[slug]/page.tsx](src/app/sets/[slug]/page.tsx) — URL-state conventions; `?view=` toggle
- [src/db/schema.ts](src/db/schema.ts) — v2 tables to drop in migration 0004
- [Dockerfile](Dockerfile) — NEXT_PUBLIC build ARGs (required for Railway)
