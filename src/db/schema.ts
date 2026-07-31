import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

/** Collecting eras (Base 1999 → Mega Evolution present). */
export const eras = sqliteTable("eras", {
  id: text("id").primaryKey(), // slug e.g. "scarlet-violet"
  name: text("name").notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year"), // null = ongoing
  sortOrder: integer("sort_order").notNull(),
  accent: text("accent").notNull().default("#2A75BB"), // era accent color
});

/** A set = a TCGplayer "group" (canonical id joins products & prices natively). */
export const sets = sqliteTable(
  "sets",
  {
    groupId: integer("group_id").primaryKey(),
    eraId: text("era_id")
      .notNull()
      .references(() => eras.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    abbreviation: text("abbreviation"),
    releaseDate: text("release_date"), // YYYY-MM-DD
    isSupplemental: integer("is_supplemental", { mode: "boolean" })
      .notNull()
      .default(false),
    logoUrl: text("logo_url"), // TCGdex enrichment, may be null
    cardCount: integer("card_count").notNull().default(0),
    language: text("language").notNull().default("en"), // 'en' | 'jp'
  },
  (t) => [uniqueIndex("sets_slug_uq").on(t.slug), index("sets_era_idx").on(t.eraId)],
);

/** Single cards (TCGplayer products that carry a card Number). */
export const cards = sqliteTable(
  "cards",
  {
    productId: integer("product_id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => sets.groupId),
    name: text("name").notNull(),
    number: text("number"), // display number e.g. "199/165"
    sortNumber: integer("sort_number"), // numeric part for ordering
    rarity: text("rarity"),
    imageUrl: text("image_url").notNull(), // TCGplayer CDN (official scan)
    tcgplayerUrl: text("tcgplayer_url").notNull(),
  },
  (t) => [index("cards_group_idx").on(t.groupId), index("cards_name_idx").on(t.name)],
);

export type SealedType =
  | "booster_box"
  | "etb"
  | "booster_bundle"
  | "loose_pack"
  | "blister"
  | "collection_box"
  | "upc"
  | "tin"
  | "deck"
  | "build_battle"
  | "accessory"
  | "other";

/** Sealed products & accessories (products without a card number). */
export const sealedProducts = sqliteTable(
  "sealed_products",
  {
    productId: integer("product_id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => sets.groupId),
    name: text("name").notNull(),
    productType: text("product_type").$type<SealedType>().notNull(),
    imageUrl: text("image_url").notNull(),
    tcgplayerUrl: text("tcgplayer_url").notNull(),
    description: text("description"), // official TCGplayer product copy (HTML-ish)
  },
  (t) => [
    index("sealed_group_idx").on(t.groupId),
    index("sealed_type_idx").on(t.productType),
  ],
);

/** "What's inside" — curated contents per sealed product. */
export const sealedContents = sqliteTable(
  "sealed_contents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => sealedProducts.productId),
    label: text("label").notNull(), // e.g. "36 booster packs"
    quantity: integer("quantity"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("contents_product_idx").on(t.productId)],
);

/** Daily price time series for BOTH cards and sealed (unified by productId). */
export const priceSnapshots = sqliteTable(
  "price_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull(),
    subType: text("sub_type").notNull(), // "Normal" | "Holofoil" | "Reverse Holofoil" | ...
    date: text("date").notNull(), // YYYY-MM-DD (UTC, source-file date)
    low: real("low"),
    mid: real("mid"),
    high: real("high"),
    market: real("market"),
    directLow: real("direct_low"),
  },
  (t) => [
    uniqueIndex("snap_uq").on(t.productId, t.subType, t.date),
    index("snap_product_date_idx").on(t.productId, t.date),
    index("snap_date_idx").on(t.date),
  ],
);

export type ChaseTier = "grail" | "chase" | "notable";

/** Materialized chase ranking, replaced on every compute run. */
export const chaseCurrent = sqliteTable(
  "chase_current",
  {
    productId: integer("product_id").primaryKey(),
    groupId: integer("group_id").notNull(),
    rank: integer("rank").notNull(), // 1-based within set
    tier: text("tier").$type<ChaseTier>().notNull(),
    market: real("market").notNull(),
    delta7: real("delta7"), // absolute $ change vs ~7 days ago
    delta7Pct: real("delta7_pct"),
    delta30Pct: real("delta30_pct"),
    computedDate: text("computed_date").notNull(),
  },
  (t) => [index("chase_group_idx").on(t.groupId), index("chase_tier_idx").on(t.tier)],
);

/** Manual editorial overrides applied after automatic scoring. */
export const chaseOverrides = sqliteTable("chase_overrides", {
  productId: integer("product_id").primaryKey(),
  forcedTier: text("forced_tier").$type<ChaseTier | "exclude">().notNull(),
  note: text("note"),
});

/** Graded-market prices (PSA/BGS/CGC…) from an external comps provider. */
export const gradedPrices = sqliteTable(
  "graded_prices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id").notNull(), // our TCGplayer product id
    source: text("source").notNull(), // 'pricecharting'
    grade: text("grade").notNull(), // 'Ungraded' | 'Grade 9' | 'PSA 10' | ...
    price: real("price").notNull(), // USD
    matchedName: text("matched_name"), // provider's product name, for match audit
    fetchedAt: text("fetched_at").notNull(), // YYYY-MM-DD
  },
  (t) => [
    uniqueIndex("graded_uq").on(t.productId, t.source, t.grade),
    index("graded_product_idx").on(t.productId),
  ],
);

/** Ingestion observability. */
export const jobRuns = sqliteTable(
  "job_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    job: text("job").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    status: text("status").$type<"running" | "ok" | "error">().notNull(),
    itemsWritten: integer("items_written").notNull().default(0),
    error: text("error"),
  },
  (t) => [index("jobs_job_idx").on(t.job, t.startedAt)],
);

/* ---------------- v2-ready (accounts & portfolio, unused in v1) ------------- */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: text("created_at").notNull(),
});

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    productId: integer("product_id").notNull(),
    subType: text("sub_type").notNull().default("Normal"),
    quantity: integer("quantity").notNull().default(1),
    condition: text("condition"),
    acquiredPrice: real("acquired_price"),
    acquiredAt: text("acquired_at"),
  },
  (t) => [index("coll_user_idx").on(t.userId)],
);

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(),
    totalValue: real("total_value").notNull(),
  },
  (t) => [uniqueIndex("port_uq").on(t.userId, t.date)],
);
