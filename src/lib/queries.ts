import "server-only";
import { sql, eq, asc } from "drizzle-orm";
import { getDb, tables } from "@/db";
import type { ChaseTier, SealedType } from "@/db/schema";

/* ------------------------------- meta ---------------------------------- */

export function latestSnapshotDate(): string | null {
  const db = getDb();
  return db.get<{ d: string | null }>(sql`select max(date) as d from price_snapshots`)?.d ?? null;
}

export function siteStats() {
  const db = getDb();
  const row = db.get<{
    sets: number;
    cards: number;
    sealed: number;
    snaps: number;
    firstDate: string | null;
  }>(sql`
    select
      (select count(*) from sets) as sets,
      (select count(*) from cards) as cards,
      (select count(*) from sealed_products) as sealed,
      (select count(*) from price_snapshots) as snaps,
      (select min(date) from price_snapshots) as firstDate
  `);
  return { ...row!, latestDate: latestSnapshotDate() };
}

/* ------------------------------- sets ---------------------------------- */

export interface SetRow {
  groupId: number;
  eraId: string;
  name: string;
  slug: string;
  releaseDate: string | null;
  isSupplemental: boolean;
  logoUrl: string | null;
  cardCount: number;
}

export function erasWithSets() {
  const db = getDb();
  const eras = db.select().from(tables.eras).orderBy(asc(tables.eras.sortOrder)).all();
  const sets = db.all<Omit<SetRow, "isSupplemental"> & { isSupplemental: number }>(sql`
    select group_id as groupId, era_id as eraId, name, slug, release_date as releaseDate,
           is_supplemental as isSupplemental, logo_url as logoUrl, card_count as cardCount
    from sets order by release_date desc nulls last, name
  `);
  return eras
    .map((e) => ({
      ...e,
      sets: sets.filter((s) => s.eraId === e.id).map((s) => ({ ...s, isSupplemental: !!s.isSupplemental })),
    }))
    .filter((e) => e.sets.length > 0);
}

export function setBySlug(slug: string) {
  const db = getDb();
  const s = db
    .select()
    .from(tables.sets)
    .where(eq(tables.sets.slug, slug))
    .get();
  if (!s) return null;
  const era = db.select().from(tables.eras).where(eq(tables.eras.id, s.eraId)).get();
  return { ...s, era };
}

export function newestSets(limit = 6) {
  // TCGplayer's publishedOn is sometimes the catalog-entry date, not the set
  // release (old POP/promo groups carry modern dates). Guard: a set only counts
  // as "new" if its date fits inside its era's window (+1y grace).
  const db = getDb();
  return db.all<SetRow>(sql`
    select s.group_id as groupId, s.era_id as eraId, s.name, s.slug,
           s.release_date as releaseDate, s.is_supplemental as isSupplemental,
           s.logo_url as logoUrl, s.card_count as cardCount
    from sets s join eras e on e.id = s.era_id
    where s.is_supplemental = 0 and s.release_date is not null
      and (e.end_year is null or cast(substr(s.release_date, 1, 4) as integer) <= e.end_year + 1)
    order by s.release_date desc limit ${limit}
  `);
}

/* ------------------------------ chase ----------------------------------- */

export interface ChaseCardRow {
  productId: number;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string;
  market: number;
  delta7Pct: number | null;
  delta30Pct: number | null;
  rank: number;
  tier: ChaseTier;
  setName?: string;
  setSlug?: string;
}

export function chaseForSet(groupId: number): ChaseCardRow[] {
  const db = getDb();
  return db.all<ChaseCardRow>(sql`
    select ch.product_id as productId, c.name, c.number, c.rarity, c.image_url as imageUrl,
           ch.market, ch.delta7_pct as delta7Pct, ch.delta30_pct as delta30Pct, ch.rank, ch.tier
    from chase_current ch join cards c on c.product_id = ch.product_id
    where ch.group_id = ${groupId}
    order by ch.rank asc
  `);
}

export function topChaseGlobal(limit = 8): ChaseCardRow[] {
  const db = getDb();
  return db.all<ChaseCardRow>(sql`
    select ch.product_id as productId, c.name, c.number, c.rarity, c.image_url as imageUrl,
           ch.market, ch.delta7_pct as delta7Pct, ch.delta30_pct as delta30Pct, ch.rank, ch.tier,
           s.name as setName, s.slug as setSlug
    from chase_current ch
    join cards c on c.product_id = ch.product_id
    join sets s on s.group_id = ch.group_id
    order by ch.market desc limit ${limit}
  `);
}

/* ------------------------------ cards ----------------------------------- */

export interface CardListRow {
  productId: number;
  name: string;
  number: string | null;
  sortNumber: number | null;
  rarity: string | null;
  imageUrl: string;
  market: number | null;
}

export function cardsForSet(groupId: number, sort: "number" | "price" | "name"): CardListRow[] {
  const db = getDb();
  const order =
    sort === "price"
      ? sql`market desc nulls last`
      : sort === "name"
        ? sql`c.name asc`
        : sql`c.sort_number asc nulls last, c.number asc`;
  return db.all<CardListRow>(sql`
    select c.product_id as productId, c.name, c.number, c.sort_number as sortNumber,
           c.rarity, c.image_url as imageUrl,
           (select max(ps.market) from price_snapshots ps
             where ps.product_id = c.product_id
               and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = c.product_id)
           ) as market
    from cards c
    where c.group_id = ${groupId}
    order by ${order}
  `);
}

export function cardById(productId: number) {
  const db = getDb();
  const card = db.get<{
    productId: number;
    groupId: number;
    name: string;
    number: string | null;
    rarity: string | null;
    imageUrl: string;
    tcgplayerUrl: string;
    setName: string;
    setSlug: string;
    eraId: string;
    releaseDate: string | null;
  }>(sql`
    select c.product_id as productId, c.group_id as groupId, c.name, c.number, c.rarity,
           c.image_url as imageUrl, c.tcgplayer_url as tcgplayerUrl,
           s.name as setName, s.slug as setSlug, s.era_id as eraId, s.release_date as releaseDate
    from cards c join sets s on s.group_id = c.group_id
    where c.product_id = ${productId}
  `);
  if (!card) return null;
  const chase = db.get<{ rank: number; tier: ChaseTier; delta7Pct: number | null; delta30Pct: number | null }>(sql`
    select rank, tier, delta7_pct as delta7Pct, delta30_pct as delta30Pct
    from chase_current where product_id = ${productId}
  `);
  return { ...card, chase: chase ?? null };
}

export interface VariantPrice {
  subType: string;
  date: string;
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
}

export function latestVariantPrices(productId: number): VariantPrice[] {
  const db = getDb();
  return db.all<VariantPrice>(sql`
    select sub_type as subType, date, low, mid, high, market, direct_low as directLow
    from price_snapshots
    where product_id = ${productId}
      and date = (select max(date) from price_snapshots where product_id = ${productId})
    order by market desc nulls last
  `);
}

export interface HistoryPoint {
  date: string;
  subType: string;
  market: number | null;
  low: number | null;
}

export function priceHistory(productId: number): HistoryPoint[] {
  const db = getDb();
  return db.all<HistoryPoint>(sql`
    select date, sub_type as subType, market, low
    from price_snapshots
    where product_id = ${productId} and market is not null
    order by date asc
  `);
}

/* ------------------------------ sealed ----------------------------------- */

export interface SealedRow {
  productId: number;
  name: string;
  productType: SealedType;
  imageUrl: string;
  market: number | null;
  contents: Array<{ label: string; verified: boolean }>;
}

export function sealedForSet(groupId: number): SealedRow[] {
  const db = getDb();
  const rows = db.all<Omit<SealedRow, "contents">>(sql`
    select sp.product_id as productId, sp.name, sp.product_type as productType,
           sp.image_url as imageUrl,
           (select max(ps.market) from price_snapshots ps
             where ps.product_id = sp.product_id
               and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = sp.product_id)
           ) as market
    from sealed_products sp
    where sp.group_id = ${groupId}
    order by market desc nulls last
  `);
  const contents = db.all<{ productId: number; label: string; verified: number }>(sql`
    select sc.product_id as productId, sc.label, sc.verified
    from sealed_contents sc
    join sealed_products sp on sp.product_id = sc.product_id
    where sp.group_id = ${groupId}
    order by sc.id
  `);
  const byProduct = new Map<number, Array<{ label: string; verified: boolean }>>();
  for (const c of contents) {
    const arr = byProduct.get(c.productId) ?? [];
    arr.push({ label: c.label, verified: !!c.verified });
    byProduct.set(c.productId, arr);
  }
  return rows.map((r) => ({ ...r, contents: byProduct.get(r.productId) ?? [] }));
}

export function sealedById(productId: number) {
  const db = getDb();
  const p = db.get<{
    productId: number;
    groupId: number;
    name: string;
    productType: SealedType;
    imageUrl: string;
    tcgplayerUrl: string;
    description: string | null;
    setName: string;
    setSlug: string;
  }>(sql`
    select sp.product_id as productId, sp.group_id as groupId, sp.name,
           sp.product_type as productType, sp.image_url as imageUrl,
           sp.tcgplayer_url as tcgplayerUrl, sp.description,
           s.name as setName, s.slug as setSlug
    from sealed_products sp join sets s on s.group_id = sp.group_id
    where sp.product_id = ${productId}
  `);
  if (!p) return null;
  const contents = db.all<{ label: string; verified: number }>(sql`
    select label, verified from sealed_contents where product_id = ${productId} order by id
  `);
  return { ...p, contents: contents.map((c) => ({ label: c.label, verified: !!c.verified })) };
}

/* ------------------------------ movers ----------------------------------- */

export interface MoverRow {
  productId: number;
  name: string;
  imageUrl: string;
  kind: "card" | "sealed";
  setName: string;
  setSlug: string;
  cur: number;
  prev: number;
  pct: number;
}

export function movers(direction: "up" | "down", limit = 12, minPrice = 5): MoverRow[] {
  const db = getDb();
  const latest = latestSnapshotDate();
  if (!latest) return [];
  const prev = db.get<{ d: string | null }>(sql`
    select max(date) as d from price_snapshots where date <= date(${latest}, '-6 days')
  `)?.d;
  if (!prev || prev === latest) return [];
  const order = direction === "up" ? sql`pct desc` : sql`pct asc`;
  return db.all<MoverRow>(sql`
    select * from (
      select x.product_id as productId,
             coalesce(c.name, sp.name) as name,
             coalesce(c.image_url, sp.image_url) as imageUrl,
             case when c.product_id is not null then 'card' else 'sealed' end as kind,
             s.name as setName, s.slug as setSlug,
             x.cur, x.prev, (x.cur - x.prev) * 100.0 / x.prev as pct
      from (
        select a.product_id, max(a.market) as cur, max(b.market) as prev
        from price_snapshots a
        join price_snapshots b on b.product_id = a.product_id and b.sub_type = a.sub_type
        where a.date = ${latest} and b.date = ${prev}
          and a.market is not null and b.market is not null
        group by a.product_id
      ) x
      left join cards c on c.product_id = x.product_id
      left join sealed_products sp on sp.product_id = x.product_id
      join sets s on s.group_id = coalesce(c.group_id, sp.group_id)
      where x.cur >= ${minPrice} and x.prev >= ${minPrice}
        and (sp.product_type is null or sp.product_type not in ('accessory'))
    )
    order by ${order} limit ${limit}
  `);
}

/* --------------------- learn-hub example lookups ------------------------- */

export interface ExampleCard {
  productId: number;
  name: string;
  number: string | null;
  rarity: string | null;
  imageUrl: string;
  setName: string;
  market: number | null;
}

const CARD_WITH_PRICE = sql`
  select c.product_id as productId, c.name, c.number, c.rarity,
         c.image_url as imageUrl, s.name as setName, s.era_id as eraId,
         (select max(ps.market) from price_snapshots ps
           where ps.product_id = c.product_id
             and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = c.product_id)
         ) as market
  from cards c join sets s on s.group_id = c.group_id
`;

const MODERN_ERAS = sql`('sword-shield', 'scarlet-violet', 'mega-evolution')`;

/**
 * Modern example card of a printed rarity. mode "top" = most valuable (the
 * ceiling); mode "median" = the typical card at today's median market price.
 */
export function exampleByRarity(
  rarity: string,
  mode: "top" | "median" = "top",
): ExampleCard | null {
  const db = getDb();
  const base = sql`
    select * from (${CARD_WITH_PRICE})
    where rarity = ${rarity} and eraId in ${MODERN_ERAS} and market is not null
  `;
  if (mode === "top") {
    return db.get<ExampleCard>(sql`${base} order by market desc limit 1`) ?? null;
  }
  const n = db.get<{ c: number }>(sql`select count(*) as c from (${base})`)?.c ?? 0;
  if (n === 0) return null;
  return (
    db.get<ExampleCard>(sql`${base} order by market limit 1 offset ${Math.floor(n / 2)}`) ??
    null
  );
}

/** Most valuable card whose name matches a LIKE pattern (e.g. alt arts). */
export function exampleByNamePattern(pattern: string): ExampleCard | null {
  const db = getDb();
  return (
    db.get<ExampleCard>(sql`
      select * from (${CARD_WITH_PRICE})
      where name like ${pattern} and market is not null
      order by market desc limit 1
    `) ?? null
  );
}

/** Most valuable card per set for one Pokémon — a character-collection lane. */
export function characterGallery(name: string, limit = 6): ExampleCard[] {
  const db = getDb();
  return db.all<ExampleCard>(sql`
    select productId, name, number, rarity, imageUrl, setName, max(market) as market
    from (${CARD_WITH_PRICE})
    where name like ${name + "%"} and market is not null
    group by setName
    order by market desc limit ${limit}
  `);
}

export interface LineupProduct {
  productId: number;
  name: string;
  productType: SealedType;
  imageUrl: string;
  market: number | null;
}

/** One representative sealed product per type from the newest main set that has them. */
export function sealedLineup(groupId: number, types: SealedType[]): LineupProduct[] {
  const db = getDb();
  const rows = db.all<LineupProduct>(sql`
    select sp.product_id as productId, sp.name, sp.product_type as productType,
           sp.image_url as imageUrl,
           (select max(ps.market) from price_snapshots ps
             where ps.product_id = sp.product_id
               and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = sp.product_id)
           ) as market
    from sealed_products sp
    where sp.group_id = ${groupId}
  `);
  const out: LineupProduct[] = [];
  for (const t of types) {
    const candidates = rows
      .filter((r) => r.productType === t && r.market !== null)
      .sort((a, b) => a.name.length - b.name.length || (b.market ?? 0) - (a.market ?? 0));
    if (candidates[0]) out.push(candidates[0]);
  }
  return out;
}

/* ------------------------------ search ----------------------------------- */

export function searchAll(q: string) {
  const db = getDb();
  const like = `%${q.replace(/[%_]/g, " ").trim()}%`;
  const cards = db.all<CardListRow & { setName: string; setSlug: string }>(sql`
    select c.product_id as productId, c.name, c.number, c.sort_number as sortNumber,
           c.rarity, c.image_url as imageUrl, s.name as setName, s.slug as setSlug,
           (select max(ps.market) from price_snapshots ps
             where ps.product_id = c.product_id
               and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = c.product_id)
           ) as market
    from cards c join sets s on s.group_id = c.group_id
    where c.name like ${like}
    order by market desc nulls last limit 36
  `);
  const sets = db.all<SetRow>(sql`
    select group_id as groupId, era_id as eraId, name, slug, release_date as releaseDate,
           is_supplemental as isSupplemental, logo_url as logoUrl, card_count as cardCount
    from sets where name like ${like} order by release_date desc limit 10
  `);
  const sealed = db.all<{ productId: number; name: string; imageUrl: string; setName: string; market: number | null }>(sql`
    select sp.product_id as productId, sp.name, sp.image_url as imageUrl, s.name as setName,
           (select max(ps.market) from price_snapshots ps
             where ps.product_id = sp.product_id
               and ps.date = (select max(date) from price_snapshots ps2 where ps2.product_id = sp.product_id)
           ) as market
    from sealed_products sp join sets s on s.group_id = sp.group_id
    where sp.name like ${like} and sp.product_type != 'accessory'
    order by market desc nulls last limit 12
  `);
  return { cards, sets, sealed };
}
