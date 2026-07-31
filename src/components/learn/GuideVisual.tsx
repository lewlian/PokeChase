import Link from "next/link";
import { LangChip } from "@/components/LangChip";
import { PriceChart } from "@/components/PriceChart";
import { typicalPackCount, SEALED_TYPE_LABEL } from "@/lib/classify";
import { money } from "@/lib/format";
import { imageAt } from "@/lib/images";
import {
  characterGallery,
  exampleByNamePattern,
  exampleByRarity,
  priceHistory,
  sealedLineup,
  setBySlug,
  topChaseGlobal,
  type ExampleCard,
} from "@/lib/queries";
import type { SealedType } from "@/db/schema";

/* ------------------------------ shared bits ------------------------------ */

function CardStrip({
  cards,
  captions,
  note,
}: {
  cards: ExampleCard[];
  captions?: string[];
  note?: string;
}) {
  if (cards.length === 0) return null;
  return (
    <figure className="my-5 rounded-2xl border border-line bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, i) => (
          <Link key={c.productId} href={`/cards/${c.productId}`} className="card-hover block">
            {captions?.[i] ? (
              <p className="mb-1 truncate text-center text-[10px] font-bold uppercase tracking-wider text-pokeblue">
                {captions[i]}
              </p>
            ) : null}
            <div className="shine">
              <img
                src={imageAt(c.imageUrl, "400w")}
                alt={`${c.name} — ${c.rarity ?? "card"}`}
                loading="lazy"
                className="aspect-5/7 w-full rounded-lg bg-surface2 object-contain"
              />
            </div>
            <p className="mt-1 truncate text-center text-xs font-medium" title={c.name}>
              {c.name}
            </p>
            <p className="flex items-center justify-center gap-1 truncate text-center text-xs text-mut">
              <LangChip language={c.language} />
              <span className="truncate">{c.setName}</span>
            </p>
            <p className="text-center text-sm font-bold tabular-nums">{money(c.market)}</p>
          </Link>
        ))}
      </div>
      {note ? (
        <figcaption className="mt-3 text-center text-xs text-mut">{note}</figcaption>
      ) : null}
    </figure>
  );
}

/* ------------------------------- visuals --------------------------------- */

function RarityLadder() {
  const specs: Array<{ caption: string; card: ExampleCard | null }> = [
    { caption: "Common", card: exampleByRarity("Common", "median") },
    { caption: "Double Rare (ex)", card: exampleByRarity("Double Rare", "median") },
    { caption: "Ultra Rare", card: exampleByRarity("Ultra Rare", "median") },
    { caption: "Illustration Rare", card: exampleByRarity("Illustration Rare", "median") },
    {
      caption: "Special Illustration Rare",
      card: exampleByRarity("Special Illustration Rare", "median"),
    },
    { caption: "Hyper Rare (gold)", card: exampleByRarity("Hyper Rare", "median") },
  ];
  const cards = specs.filter((s) => s.card).map((s) => s.card!);
  const captions = specs.filter((s) => s.card).map((s) => s.caption);
  return (
    <CardStrip
      cards={cards}
      captions={captions}
      note="The modern rarity ladder — a typical (median-priced) card of each rarity at today's prices. Value concentrates violently in the artwork rarities at the top. Tap any card for its live price."
    />
  );
}

function CharacterGallery({ name }: { name: string }) {
  const cards = characterGallery(name, 6);
  return (
    <CardStrip
      cards={cards}
      note={`A ${name} character collection — one card per set, exactly how a character lane grows. All prices are live.`}
    />
  );
}

function AltArtShowcase() {
  const alt = exampleByNamePattern("%(Alternate Art%");
  const sir = exampleByRarity("Special Illustration Rare");
  const cards = [alt, sir].filter(Boolean) as ExampleCard[];
  return (
    <CardStrip
      cards={cards}
      captions={["Alt art (SWSH era)", "SIR (SV era)"]}
      note="Artwork-first rarities are the modern chase: alternate arts and their Scarlet & Violet successors, Special Illustration Rares."
    />
  );
}

function SealedLineup() {
  // Newest main set with a full product lineup
  const set = setBySlug("me05-pitch-black");
  if (!set) return null;
  const types: SealedType[] = [
    "booster_box",
    "etb",
    "booster_bundle",
    "blister",
    "loose_pack",
    "build_battle",
  ];
  const lineup = sealedLineup(set.groupId, types);
  if (lineup.length === 0) return null;
  return (
    <figure className="my-5 overflow-x-auto rounded-2xl border border-line bg-surface p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {lineup.map((p) => {
          const packs = typicalPackCount(p.productType, p.name);
          return (
            <Link key={p.productId} href={`/products/${p.productId}`} className="card-hover block text-center">
              <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-wider text-pokeblue">
                {SEALED_TYPE_LABEL[p.productType]}
              </p>
              <div className="flex h-28 items-center justify-center rounded-lg bg-surface2 p-2">
                <img
                  src={imageAt(p.imageUrl, "400w")}
                  alt={p.name}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="mt-1 text-sm font-bold tabular-nums">{money(p.market)}</p>
              <p className="text-xs text-mut tabular-nums">
                {p.market && packs && packs > 1 ? `${money(p.market / packs)}/pack` : " "}
              </p>
            </Link>
          );
        })}
      </div>
      <figcaption className="mt-2 text-center text-xs text-mut">
        The full product lineup for one current set ({set.name}), with live prices and
        price-per-pack — see how the same packs cost different amounts in different boxes.
      </figcaption>
    </figure>
  );
}

const GRADES = [
  { g: "1–5", label: "Played", cls: "bg-loss/60", grow: 5 },
  { g: "6", label: "EX-NM", cls: "bg-loss/40", grow: 1 },
  { g: "7", label: "Near Mint", cls: "bg-pokeyellow/50", grow: 1 },
  { g: "8", label: "NM-Mint", cls: "bg-pokeyellow", grow: 1 },
  { g: "9", label: "Mint", cls: "bg-gain/70", grow: 1 },
  { g: "10", label: "Gem Mint", cls: "bg-gain", grow: 1 },
];

function GradingScale() {
  return (
    <figure className="my-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex overflow-hidden rounded-lg text-center text-[11px] font-bold">
        {GRADES.map((s) => (
          <div key={s.g} className={`${s.cls} px-1 py-3 text-[#1c2033]`} style={{ flexGrow: s.grow, flexBasis: 0 }}>
            {s.g}
            <span className="block text-[9px] font-semibold opacity-80">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-mut sm:grid-cols-3">
        <p>
          <span className="font-bold text-ink">PSA 10</span> — the benchmark. Often 2–4×
          the raw price on modern cards.
        </p>
        <p>
          <span className="font-bold text-ink">PSA 9</span> — frequently sells near a
          clean raw copy. The grade that decides profitability.
        </p>
        <p>
          <span className="font-bold text-ink">≤ 8</span> — usually below break-even
          after fees on modern cards.
        </p>
      </div>
      <figcaption className="mt-2 text-center text-xs text-mut">
        The 1–10 grading scale, judged on centering, corners, edges, and surface.
      </figcaption>
    </figure>
  );
}

function CenteringDemo({ off }: { off: boolean }) {
  return (
    <div className="flex-1">
      <div className="mx-auto aspect-5/7 w-32 rounded-lg border-2 border-line bg-pokeyellow/90 p-0 sm:w-36">
        <div
          className="h-full w-full rounded-md bg-pokeblue/80"
          style={{
            transform: off ? "translate(6%, 4%) scale(0.82)" : "scale(0.82)",
          }}
        />
      </div>
      <p className="mt-2 text-center text-xs font-semibold">
        {off ? "≈65/35 centering" : "≈50/50 centering"}
      </p>
      <p className="text-center text-xs text-mut">
        {off ? "Caps most cards at a 9 or below" : "What a 10 wants"}
      </p>
    </div>
  );
}

function Centering() {
  return (
    <figure className="my-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-center gap-8">
        <CenteringDemo off={false} />
        <CenteringDemo off={true} />
      </div>
      <figcaption className="mt-3 text-center text-xs text-mut">
        Centering — how evenly the artwork sits inside the border — is the most common
        reason an otherwise clean card misses a 10. Check it before you pay for grading.
      </figcaption>
    </figure>
  );
}

const LADDER_STEPS = [
  { value: "Bulk", gear: "1000-count box", h: "h-10" },
  { value: "$1+", gear: "Penny sleeve", h: "h-16" },
  { value: "$5+", gear: "Sleeve + toploader", h: "h-24" },
  { value: "$50+", gear: "Magnetic one-touch", h: "h-32" },
  { value: "$100+", gear: "Consider grading", h: "h-40" },
];

function ProtectionLadder() {
  return (
    <figure className="my-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        {LADDER_STEPS.map((s, i) => (
          <div key={s.value} className="flex w-24 flex-col items-center sm:w-28">
            <div
              className={`${s.h} w-full rounded-t-lg border border-b-0 border-line bg-surface2`}
              style={{ background: `color-mix(in srgb, var(--poke-blue) ${15 + i * 18}%, var(--surface-2))` }}
            />
            <div className="w-full border-t-2 border-pokeyellow py-1.5 text-center">
              <p className="text-sm font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] leading-tight text-mut">{s.gear}</p>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-center text-xs text-mut">
        The protection ladder: spend on protection in proportion to card value.
      </figcaption>
    </figure>
  );
}

function LiveChart() {
  const top = topChaseGlobal(1)[0];
  if (!top) return null;
  const history = priceHistory(top.productId);
  return (
    <figure className="my-5 rounded-2xl border border-line bg-surface p-4">
      <p className="mb-3 text-sm">
        <span className="font-bold">Live example:</span>{" "}
        <Link href={`/cards/${top.productId}`} className="text-pokeblue hover:underline">
          {top.name}
        </Link>{" "}
        ({top.setName}) — currently {money(top.market)}. This is the same chart you&apos;ll
        find on every card page; try the range buttons.
      </p>
      <PriceChart history={history} />
    </figure>
  );
}

/* ------------------------------ dispatcher ------------------------------- */

export function GuideVisual({ spec }: { spec: string }) {
  const [kind, param] = spec.split(":");
  switch (kind) {
    case "rarity-ladder":
      return <RarityLadder />;
    case "alt-art-showcase":
      return <AltArtShowcase />;
    case "character-gallery":
      return <CharacterGallery name={param || "Umbreon"} />;
    case "sealed-lineup":
      return <SealedLineup />;
    case "grading-scale":
      return <GradingScale />;
    case "centering":
      return <Centering />;
    case "protection-ladder":
      return <ProtectionLadder />;
    case "live-chart":
      return <LiveChart />;
    default:
      return null;
  }
}
