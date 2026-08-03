import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { latestSnapshotDate } from "@/lib/queries";
import {
  SCREENER_PAGE_SIZE,
  type ScreenerParams,
  type SortDir,
  type ScreenerSort,
} from "@/lib/market-params";

/**
 * Market-view queries: all-cards price + change tables. Unlike chase_current
 * (top ~20 per set), these cover every card, so they anchor on the latest
 * snapshot date and self-join to the 7d/30d anchor dates — never a correlated
 * subquery per row (movers() pattern, see queries.ts).
 *
 * "Best variant" = the sub_type with the highest market at the latest date;
 * changes are computed against that same sub_type at the anchor dates so a
 * Holofoil price is never compared to a Normal price.
 */

export interface MarketAnchors {
  latest: string;
  d7: string | null;
  d30: string | null;
}

export function marketAnchors(): MarketAnchors | null {
  const db = getDb();
  const latest = latestSnapshotDate();
  if (!latest) return null;
  const anchor = (days: number) =>
    db.get<{ d: string | null }>(sql`
      select max(date) as d from price_snapshots where date <= date(${latest}, ${`-${days} days`})
    `)?.d ?? null;
  return { latest, d7: anchor(6), d30: anchor(29) };
}

/** Best variant per product at the latest date, as a reusable CTE body. */
function bestCte(latest: string): SQL {
  return sql`
    select product_id, sub_type, market as cur from (
      select product_id, sub_type, market,
             row_number() over (partition by product_id order by market desc) as rn
      from price_snapshots
      where date = ${latest} and market is not null
    ) where rn = 1
  `;
}

function pctExpr(anchorAlias: string): SQL {
  const a = sql.raw(anchorAlias);
  return sql`case when ${a}.market > 0 then (b.cur - ${a}.market) * 100.0 / ${a}.market end`;
}

export interface MarketCardRow {
  productId: number;
  name: string;
  number: string | null;
  sortNumber: number | null;
  rarity: string | null;
  imageUrl: string;
  subType: string | null;
  market: number | null;
  d7Pct: number | null;
  d30Pct: number | null;
}

/** Every card in a set with best-variant price + 7d/30d change. Unpriced cards
 *  are kept (null market) so the table lists the full set. Caller sorts. */
export function cardsForSetWithChange(groupId: number): MarketCardRow[] {
  const anchors = marketAnchors();
  if (!anchors) return [];
  const db = getDb();
  return db.all<MarketCardRow>(sql`
    with best as (${bestCte(anchors.latest)})
    select c.product_id as productId, c.name, c.number, c.sort_number as sortNumber,
           c.rarity, c.image_url as imageUrl,
           b.sub_type as subType, b.cur as market,
           ${pctExpr("p7")} as d7Pct,
           ${pctExpr("p30")} as d30Pct
    from cards c
    left join best b on b.product_id = c.product_id
    left join price_snapshots p7
      on p7.product_id = b.product_id and p7.sub_type = b.sub_type and p7.date = ${anchors.d7}
    left join price_snapshots p30
      on p30.product_id = b.product_id and p30.sub_type = b.sub_type and p30.date = ${anchors.d30}
    where c.group_id = ${groupId}
  `);
}

export interface ScreenerRow extends MarketCardRow {
  setName: string;
  setSlug: string;
  language: string;
}

const SCREENER_ORDER: Record<ScreenerSort, Record<SortDir, SQL>> = {
  price: { asc: sql`market asc`, desc: sql`market desc` },
  d7: { asc: sql`d7Pct asc nulls last`, desc: sql`d7Pct desc nulls last` },
  d30: { asc: sql`d30Pct asc nulls last`, desc: sql`d30Pct desc nulls last` },
  name: { asc: sql`name asc`, desc: sql`name desc` },
};

export function marketScreener(p: ScreenerParams): { rows: ScreenerRow[]; total: number } {
  const anchors = marketAnchors();
  if (!anchors) return { rows: [], total: 0 };
  const db = getDb();
  const filters = [sql`b.cur >= ${p.minPrice}`];
  if (p.eraId) filters.push(sql`s.era_id = ${p.eraId}`);
  if (p.language) filters.push(sql`s.language = ${p.language}`);
  const where = sql.join(filters, sql` and `);
  const total =
    db.get<{ n: number }>(sql`
      with best as (${bestCte(anchors.latest)})
      select count(*) as n
      from best b
      join cards c on c.product_id = b.product_id
      join sets s on s.group_id = c.group_id
      where ${where}
    `)?.n ?? 0;
  const rows = db.all<ScreenerRow>(sql`
    with best as (${bestCte(anchors.latest)})
    select c.product_id as productId, c.name, c.number, c.sort_number as sortNumber,
           c.rarity, c.image_url as imageUrl,
           s.name as setName, s.slug as setSlug, s.language,
           b.sub_type as subType, b.cur as market,
           ${pctExpr("p7")} as d7Pct,
           ${pctExpr("p30")} as d30Pct
    from best b
    join cards c on c.product_id = b.product_id
    join sets s on s.group_id = c.group_id
    left join price_snapshots p7
      on p7.product_id = b.product_id and p7.sub_type = b.sub_type and p7.date = ${anchors.d7}
    left join price_snapshots p30
      on p30.product_id = b.product_id and p30.sub_type = b.sub_type and p30.date = ${anchors.d30}
    where ${where}
    order by ${SCREENER_ORDER[p.sort][p.dir]}
    limit ${SCREENER_PAGE_SIZE} offset ${(p.page - 1) * SCREENER_PAGE_SIZE}
  `);
  return { rows, total };
}

export interface VariantRef {
  productId: number;
  subType?: string | null;
}

const IN_CHUNK = 500;

function chunked<T>(items: T[], size = IN_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function idList(ids: number[]): SQL {
  return sql.join(ids.map((id) => sql`${id}`), sql`, `);
}

/** Key for the sparkline map: one series per (productId, subType) pair. */
export function sparkKey(productId: number, subType: string | null | undefined): string {
  return `${productId}|${subType ?? ""}`;
}

/**
 * 30-day price series for the given variant refs, keyed by
 * `sparkKey(productId, subType)`. Refs without a subType are resolved to the
 * best variant first (and keyed under the resolved subType). Feeds sparklines.
 */
export function sparklinesFor(refs: VariantRef[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const anchors = marketAnchors();
  if (!anchors || refs.length === 0) return out;
  const db = getDb();

  const bestFor = new Map<number, string>();
  for (const chunk of chunked([...new Set(refs.map((r) => r.productId))])) {
    const rows = db.all<{ productId: number; subType: string }>(sql`
      with best as (${bestCte(anchors.latest)})
      select product_id as productId, sub_type as subType from best
      where product_id in (${idList(chunk)})
    `);
    for (const r of rows) bestFor.set(r.productId, r.subType);
  }

  // Fetch the requested variant *and* the best variant; callers that fall back
  // to the best variant (see batchCards) then still find a series.
  const pairs = new Map<string, [number, string]>();
  for (const r of refs) {
    for (const st of [r.subType, bestFor.get(r.productId)]) {
      if (st) pairs.set(sparkKey(r.productId, st), [r.productId, st]);
    }
  }

  for (const chunk of chunked([...pairs.values()])) {
    const values = sql.join(chunk.map(([id, st]) => sql`(${id}, ${st})`), sql`, `);
    const rows = db.all<{ productId: number; subType: string; date: string; market: number }>(sql`
      select ps.product_id as productId, ps.sub_type as subType, ps.date, ps.market
      from price_snapshots ps
      join (values ${values}) w on w.column1 = ps.product_id and w.column2 = ps.sub_type
      where ps.date >= date(${anchors.latest}, '-29 days') and ps.market is not null
      order by ps.date asc
    `);
    for (const r of rows) {
      const key = sparkKey(r.productId, r.subType);
      const arr = out.get(key) ?? [];
      arr.push(r.market);
      out.set(key, arr);
    }
  }
  return out;
}

export interface BatchCardRow {
  productId: number;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string;
  setName: string;
  setSlug: string;
  language: string;
  subType: string | null;
  market: number | null;
  d7Pct: number | null;
  d30Pct: number | null;
}

/**
 * Metadata + priced change rows for an arbitrary list of variant refs
 * (watchlists, portfolio holdings, screener sparkline hydration). A ref with
 * an explicit subType is priced from that variant; otherwise best variant.
 * One output row per distinct (productId, subType) ref — the same card held
 * in two variants stays two rows. Unknown productIds are omitted.
 */
export function batchCards(refs: VariantRef[]): BatchCardRow[] {
  const anchors = marketAnchors();
  if (!anchors || refs.length === 0) return [];
  const db = getDb();

  // Best variant per product — used both for refs that don't name a variant
  // and as a fallback for stored variants that carry no price (a saved
  // "Normal" on a card that only prints in Holofoil would otherwise show "—").
  const bestFor = new Map<number, string>();
  for (const chunk of chunked([...new Set(refs.map((r) => r.productId))])) {
    const rows = db.all<{ productId: number; subType: string }>(sql`
      with best as (${bestCte(anchors.latest)})
      select product_id as productId, sub_type as subType from best
      where product_id in (${idList(chunk)})
    `);
    for (const r of rows) bestFor.set(r.productId, r.subType);
  }
  const pairs = new Map<string, { productId: number; subType: string | null }>();
  for (const r of refs) {
    const subType = r.subType ?? bestFor.get(r.productId) ?? null;
    pairs.set(`${r.productId}|${subType ?? ""}`, { productId: r.productId, subType });
  }

  // Card + set metadata per product.
  const ids = [...new Set([...pairs.values()].map((p) => p.productId))];
  interface Meta {
    productId: number;
    name: string;
    number: string | null;
    rarity: string | null;
    imageUrl: string;
    setName: string;
    setSlug: string;
    language: string;
  }
  const meta = new Map<number, Meta>();
  for (const chunk of chunked(ids)) {
    const rows = db.all<Meta>(sql`
      select c.product_id as productId, c.name, c.number, c.rarity, c.image_url as imageUrl,
             s.name as setName, s.slug as setSlug, s.language
      from cards c join sets s on s.group_id = c.group_id
      where c.product_id in (${idList(chunk)})
    `);
    for (const r of rows) meta.set(r.productId, r);
  }

  // Market at the three anchor dates. Query both the requested variant and
  // the product's best variant, so a stored variant with no prices can fall
  // back rather than render empty.
  const priced: Array<{ productId: number; subType: string }> = [];
  const seenPair = new Set<string>();
  for (const p of pairs.values()) {
    for (const st of [p.subType, bestFor.get(p.productId)]) {
      if (!st) continue;
      const k = sparkKey(p.productId, st);
      if (seenPair.has(k)) continue;
      seenPair.add(k);
      priced.push({ productId: p.productId, subType: st });
    }
  }
  const priceKey = (id: number, st: string, date: string) => `${id}|${st}|${date}`;
  const prices = new Map<string, number>();
  for (const chunk of chunked(priced)) {
    const values = sql.join(chunk.map((p) => sql`(${p.productId}, ${p.subType})`), sql`, `);
    const rows = db.all<{ productId: number; subType: string; date: string; market: number }>(sql`
      select ps.product_id as productId, ps.sub_type as subType, ps.date, ps.market
      from price_snapshots ps
      join (values ${values}) w on w.column1 = ps.product_id and w.column2 = ps.sub_type
      where ps.date in (${sql.join(
        [anchors.latest, anchors.d7, anchors.d30].filter((d): d is string => d !== null).map((d) => sql`${d}`),
        sql`, `,
      )}) and ps.market is not null
    `);
    for (const r of rows) prices.set(priceKey(r.productId, r.subType, r.date), r.market);
  }

  const pct = (cur: number | undefined, prev: number | undefined) =>
    cur !== undefined && prev !== undefined && prev > 0 ? ((cur - prev) * 100.0) / prev : null;

  const out: BatchCardRow[] = [];
  for (const p of pairs.values()) {
    const m = meta.get(p.productId);
    if (!m) continue;
    // Use the requested variant when it has a current price; otherwise the
    // best variant (stored 'Normal' on a Holofoil-only card, delisted variant…)
    const best = bestFor.get(p.productId);
    const hasOwnPrice =
      p.subType !== null && prices.has(priceKey(p.productId, p.subType, anchors.latest));
    const subType = hasOwnPrice ? p.subType : (best ?? p.subType);
    const at = (date: string | null) =>
      subType && date ? prices.get(priceKey(p.productId, subType, date)) : undefined;
    const cur = at(anchors.latest);
    const p7 = at(anchors.d7);
    const p30 = at(anchors.d30);
    out.push({
      ...m,
      subType,
      market: cur ?? null,
      d7Pct: pct(cur, p7),
      d30Pct: pct(cur, p30),
    });
  }
  return out;
}

export interface SeriesPoint {
  productId: number;
  subType: string;
  date: string;
  market: number;
}

/** Raw per-variant market series for a set of products (portfolio history). */
export function priceSeriesFor(productIds: number[], since?: string): SeriesPoint[] {
  if (productIds.length === 0) return [];
  const db = getDb();
  const out: SeriesPoint[] = [];
  for (const chunk of chunked([...new Set(productIds)])) {
    const sinceFilter = since ? sql` and date >= ${since}` : sql``;
    out.push(
      ...db.all<SeriesPoint>(sql`
        select product_id as productId, sub_type as subType, date, market
        from price_snapshots
        where product_id in (${idList(chunk)}) and market is not null${sinceFilter}
        order by date asc
      `),
    );
  }
  return out;
}
