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

/**
 * 30-day price series per product for the given variant refs. Refs without a
 * subType are resolved to the best variant first. Feeds table sparklines.
 */
export function sparklinesFor(refs: VariantRef[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const anchors = marketAnchors();
  if (!anchors || refs.length === 0) return out;
  const db = getDb();
  const wanted = new Map<number, string | null>(refs.map((r) => [r.productId, r.subType ?? null]));

  const unresolved = [...wanted.entries()].filter(([, st]) => st == null).map(([id]) => id);
  for (const chunk of chunked(unresolved)) {
    const rows = db.all<{ productId: number; subType: string }>(sql`
      with best as (${bestCte(anchors.latest)})
      select product_id as productId, sub_type as subType from best
      where product_id in (${idList(chunk)})
    `);
    for (const r of rows) wanted.set(r.productId, r.subType);
  }

  const pairs = [...wanted.entries()].filter(([, st]) => st != null) as Array<[number, string]>;
  for (const chunk of chunked(pairs)) {
    const values = sql.join(chunk.map(([id, st]) => sql`(${id}, ${st})`), sql`, `);
    const rows = db.all<{ productId: number; date: string; market: number }>(sql`
      select ps.product_id as productId, ps.date, ps.market
      from price_snapshots ps
      join (values ${values}) w on w.column1 = ps.product_id and w.column2 = ps.sub_type
      where ps.date >= date(${anchors.latest}, '-29 days') and ps.market is not null
      order by ps.date asc
    `);
    for (const r of rows) {
      const arr = out.get(r.productId) ?? [];
      arr.push(r.market);
      out.set(r.productId, arr);
    }
  }
  return out;
}

/** VALUES table of explicitly requested (product_id, sub_type) pairs. */
function wantedValues(wanted: Map<number, string | null>, ids: number[]): SQL {
  const pairs = ids
    .filter((id) => wanted.get(id) != null)
    .map((id) => sql`(${id}, ${wanted.get(id)})`);
  if (pairs.length === 0) return sql`select null as product_id, null as sub_type where 0`;
  return sql`select column1 as product_id, column2 as sub_type from (values ${sql.join(pairs, sql`, `)})`;
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
 * Unknown productIds are omitted.
 */
export function batchCards(refs: VariantRef[]): BatchCardRow[] {
  const anchors = marketAnchors();
  if (!anchors || refs.length === 0) return [];
  const db = getDb();
  const wanted = new Map<number, string | null>(refs.map((r) => [r.productId, r.subType ?? null]));
  const out: BatchCardRow[] = [];
  for (const chunk of chunked([...wanted.keys()])) {
    const rows = db.all<BatchCardRow>(sql`
      with best as (${bestCte(anchors.latest)}),
      wanted as (${wantedValues(wanted, chunk)}),
      pick as (
        select b.product_id,
               coalesce(w.sub_type, b.sub_type) as sub_type
        from best b left join wanted w on w.product_id = b.product_id
      )
      select c.product_id as productId, c.name, c.number, c.rarity, c.image_url as imageUrl,
             s.name as setName, s.slug as setSlug, s.language,
             pk.sub_type as subType, cur.market as market,
             case when p7.market > 0 then (cur.market - p7.market) * 100.0 / p7.market end as d7Pct,
             case when p30.market > 0 then (cur.market - p30.market) * 100.0 / p30.market end as d30Pct
      from cards c
      join sets s on s.group_id = c.group_id
      left join pick pk on pk.product_id = c.product_id
      left join price_snapshots cur
        on cur.product_id = c.product_id and cur.sub_type = pk.sub_type and cur.date = ${anchors.latest}
      left join price_snapshots p7
        on p7.product_id = c.product_id and p7.sub_type = pk.sub_type and p7.date = ${anchors.d7}
      left join price_snapshots p30
        on p30.product_id = c.product_id and p30.sub_type = pk.sub_type and p30.date = ${anchors.d30}
      where c.product_id in (${idList(chunk)})
    `);
    out.push(...rows);
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
