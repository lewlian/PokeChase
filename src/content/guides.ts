export interface Guide {
  slug: string;
  title: string;
  blurb: string;
  minutes: number;
  /** Optional visual rendered after the section text — see GuideVisual. */
  sections: Array<{ h: string; ps: string[]; visual?: string }>;
}

export const GUIDES: Guide[] = [
  {
    slug: "start-here",
    title: "Start here: how Pokémon TCG collecting works",
    blurb: "Eras, sets, rarities, and how value actually flows through the hobby.",
    minutes: 8,
    sections: [
      {
        h: "The shape of the hobby",
        ps: [
          "The Pokémon Trading Card Game has released English sets continuously since Base Set in January 1999. Releases are grouped into eras named after the video-game generation on the cards — Original, Neo, e-Card, EX, Diamond & Pearl, Platinum, HeartGold & SoulSilver, Black & White, XY, Sun & Moon, Sword & Shield, Scarlet & Violet, and today's Mega Evolution era. Each era contains a handful of 'main' expansions plus special sets, promos, and retail-exclusive products.",
          "Every set contains somewhere between 60 and 250+ cards across a rarity ladder. The bottom of the ladder (commons, uncommons, plain rares) is nearly worthless in bulk. Value concentrates violently at the top: in a typical modern set, the ten most expensive cards are worth more than the other two hundred combined. Those top cards are the chase cards, and they're what this site ranks for you in every set.",
        ],
      },
      {
        h: "What makes a card valuable",
        ps: [
          "Three forces set a card's price: scarcity (how hard it is to pull or how few were printed), character (Charizard, Pikachu, Umbreon, and popular trainers command structural premiums), and condition (a Near Mint copy is the baseline; graded gem-mint copies can be worth multiples of raw ones).",
          "Modern sets concentrate value in Special Illustration Rares, alt arts, and gold secret rares. Vintage sets concentrate it in 1st Edition and Shadowless holos, and in top-graded copies of iconic cards. A fourth force — nostalgia cycles — moves whole eras at once: cards from whatever era 25-35 year olds opened as kids tend to appreciate as that cohort gains disposable income.",
        ],
        visual: "rarity-ladder",
      },
      {
        h: "The three ways to collect",
        ps: [
          "Singles buyers pick exactly the cards they want and pay market price — this is the most efficient way to get cards, full stop. Pack rippers buy sealed product for the experience of opening; expect to receive less card value than you paid (the difference is the entertainment). Sealed collectors keep product unopened, betting on long-term scarcity.",
          "A sane default for a new collector: buy singles of the cards you love, open a little product for fun from sets you enjoy, and only hold sealed with money you won't miss for five-plus years. Never treat any of it as a substitute for actual investing.",
        ],
        visual: "alt-art-showcase",
      },
      {
        h: "Using PokéChase",
        ps: [
          "Browse Sets by era to see everything ever released. Each set page ranks its chase cards (Grail = top-3 cards at $100+, Chase = top-10 or $30+, Notable = top-20 or $15+), lists every card with current market price, and prices the sealed products with what's inside each. Prices refresh daily from TCGplayer market data, and every card and product has a price-history chart.",
        ],
      },
    ],
  },
  {
    slug: "reading-rarities",
    title: "Reading rarities: Common to SAR, in every era and language",
    blurb:
      "The symbol next to the collector number, the modern IR/SIR ladder, and how Japanese AR/SAR codes map to English rarities.",
    minutes: 8,
    sections: [
      {
        h: "Start at the bottom corner",
        ps: [
          "Every English card since Base Set prints its rarity beside the collector number: a circle for Common, a diamond for Uncommon, a star for Rare. Holo and Reverse Holo are finishes, not separate symbols — a Holo Rare is a star-rarity card with foil artwork, while a Reverse Holo (available for most commons, uncommons, and rares since Legendary Collection in 2002) foils everything except the artwork. That's why one card can have several prices on this site: each variant is tracked separately.",
          "One tell works in every era and both languages: secret rares carry a collector number higher than the set total — 113/105, 215/203, 279/264. If the numerator beats the denominator, you're holding a secret rare.",
        ],
      },
      {
        h: "The modern English ladder (Scarlet & Violet onward)",
        ps: [
          "Above the classic circle/diamond/star, today's sets stack artwork rarities. Double Rare (two black stars) is the plain ex Pokémon. Ultra Rare (two silver stars) is the full-art ex or Supporter. Illustration Rare (IR, one gold star) is the artwork treatment of an ordinary Pokémon — the 'cheap beautiful cards' of a set. Special Illustration Rare (SIR, two gold stars) is the successor to alt arts and usually the set's biggest chase. Hyper Rare (three gold stars) is the gold-frame card, and despite the name it typically prices below the SIRs.",
          "Two oddballs worth recognizing: ACE SPEC cards (bright magenta frame, one per deck rule) and Shiny Rares from shiny-vault-style sets like Paldean Fates, where the Pokémon is its shiny coloration on a white-sparkle frame. The Mega era keeps the SV ladder and adds Mega-branded top slots — our data labels them Mega Hyper Rare and Mega Attack Rare.",
        ],
        visual: "rarity-ladder",
      },
      {
        h: "Earlier eras used different names for the top slots",
        ps: [
          "Vintage (1999–2002) had no artwork rarities at all — just circle/diamond/star plus holo. Value instead splits by print run: the same Charizard exists as Unlimited, Shadowless (no drop-shadow to the right of the art frame), and 1st Edition (the stamp under the art's bottom-left corner), at wildly different prices. EX era (2003–07) added Pokémon-ex and the legendary Gold Star shinies — the star is literally in the card name. Diamond & Pearl brought Lv.X, HeartGold & SoulSilver brought Primes and two-card LEGENDs.",
          "Black & White and XY standardized full-art EXs and secret golds and added BREAK (the sideways gold frame). Sun & Moon's chase slots were GX cards and rainbow 'Hyper' rares. Sword & Shield ran V/VMAX/VSTAR, plus three collector favorites: Alternate Arts (the era's grails, e.g. Moonbreon), Amazing Rares (comet-swirl foil), and the stamped subsets — Trainer Gallery numbers like TG12/TG30 and Shiny Vault numbers like SV107/SV122. Rarity names on PokéChase come straight from TCGplayer, so what you see in a set's table (Holo Rare, Secret Rare, Radiant Rare…) matches what you can filter and search.",
        ],
      },
      {
        h: "Japanese cards: letter codes instead of symbols",
        ps: [
          "Japanese cards skip the symbols and print a letter code in the bottom corner: C, U, R for the basic tiers, then RR (Double Rare — the ex cards), SR (Super Rare — full arts), UR (Ultra Rare — golds), and the artwork codes AR (Art Rare) and SAR (Special Art Rare). The mapping to English is direct: AR ↔ Illustration Rare, SAR ↔ Special Illustration Rare, RR ↔ Double Rare, SR ↔ Ultra Rare, UR ↔ Hyper Rare. Japanese sets also have no Reverse Holo line — parallel finishes are 'mirror' foils instead, and some sets add special foil stamps (the 151 Poké Ball and Master Ball mirrors are famous examples).",
          "On PokéChase, Japanese sets (the M-series pages with the red JP chip) show TCGplayer's English translations of those codes — Art Rare, Special Art Rare, Super Rare, Mega Attack Rare — so filter with those names in the Market tab. Japanese printings usually release months before their English set, at different pull rates and prices: the same artwork can be significantly cheaper or pricier in Japanese, which is why we track both and chip every card EN or JP.",
        ],
        visual: "jp-vs-en-rarities",
      },
      {
        h: "Cheat sheet",
        ps: [
          "Circle = Common, diamond = Uncommon, star = Rare — every English era. Number bigger than the set size = secret rare — every era, both languages. Gold star count (SV/Mega era): one = IR, two = SIR, three = gold Hyper. JP letter codes: RR = ex, SR = full art, UR = gold, AR = artwork card, SAR = special artwork card. Vintage value lives in the stamp: 1st Edition > Shadowless > Unlimited. When in doubt, open the card on PokéChase — the rarity is printed on every row, table, and card page.",
        ],
      },
    ],
  },
  {
    slug: "sealed-products-explained",
    title: "Booster box vs ETB vs bundle: every sealed product explained",
    blurb: "What's actually inside each product type, and how to compare them on price-per-pack.",
    minutes: 7,
    sections: [
      {
        h: "The core products",
        ps: [
          "Booster Box — 36 packs, factory sealed. The standard bulk unit and usually the best price-per-pack for opening. MSRP for modern boxes works out to roughly $161 (36 × $4.49); paying far above that for an in-print set means you're paying a hype premium.",
          "Elite Trainer Box (ETB) — 9 packs in current sets (8 in the Sword & Shield era) plus 65 sleeves, 45 energy cards, dice, markers, and a player's guide, in a heavy display box. You pay a big per-pack premium for the accessories and the box itself; collectors buy them for display and for set-branded sleeves. Pokémon Center ETBs add an exclusive promo and command a lasting premium.",
          "Booster Bundle — 6 loose packs in a slim box, no extras. Frequently the cheapest per-pack way to buy at retail. Loose/sleeved packs — single packs; convenient but the worst per-pack economics, and vintage loose packs carry weighing/resealing risk.",
        ],
        visual: "sealed-lineup",
      },
      {
        h: "Premium and promo-led products",
        ps: [
          "Ultra-Premium Collections (UPCs) bundle 10–16 packs with metal promo cards and premium accessories — the Charizard UPC is the archetype. Collection boxes, ex boxes, and tins exist to deliver a specific promo card plus a few packs; buy them when you want that promo, not for pack value. Build & Battle boxes are prerelease kits with 4 packs and exclusive stamped promos, some of which become surprisingly valuable.",
          "Blisters matter more than they look: 3-pack blisters carry exclusive stamped promos (the bracketed name in the product title, e.g. '[Binacle]'), and some blister-exclusive promos become chase items on their own.",
        ],
      },
      {
        h: "How to compare: price per pack",
        ps: [
          "Divide the product price by its pack count — PokéChase does this for you on set pages and product pages. A $130 booster box is $3.61/pack; a $55 ETB with 9 packs is $6.11/pack before you value the accessories. If you're opening for hits, buy the cheapest packs; if you're collecting product, condition of the box itself matters.",
          "Most modern products on this site show '✓ Official contents' pulled from the official product description; older products fall back to typical contents for their type. Either way, verify the listing before a significant purchase.",
        ],
      },
    ],
  },
  {
    slug: "grading",
    title: "Grading: how it works and when it's worth it",
    blurb: "PSA, BGS, CGC, the 1–10 scale, and the math of when grading pays.",
    minutes: 6,
    sections: [
      {
        h: "What grading is",
        ps: [
          "A grading company authenticates your card, scores its condition 1–10 across centering, corners, edges, and surface, and seals it in a tamper-evident slab with a label. The three majors are PSA (the liquidity king for Pokémon), Beckett/BGS (famous for 'black label' perfect 10s), and CGC (competitive pricing, strong sub-grade transparency).",
          "Grading does three things: it removes condition doubt for buyers, it protects the card physically, and — for high grades — it multiplies value. A PSA 10 of a modern chase card routinely sells for 2–4× the raw price; for vintage icons the multiple can be far higher.",
        ],
        visual: "grading-scale",
      },
      {
        h: "When it's worth it",
        ps: [
          "The math: graded value minus (raw value + grading fee + shipping + weeks of turnaround) must be positive at the grade you'll actually receive. Be brutal about that last part — pack-fresh does not mean gem mint. Check centering with your own eyes, edges and surface under a bright light, and the card's pop report and PSA-10 comps before submitting.",
          "Good candidates: chase cards worth $50+ raw that look flawless, vintage holos in genuinely clean shape, and sentimental cards you want preserved regardless of return. Bad candidates: anything where a 9 would sell for less than the all-in cost, and nearly all bulk-era rares.",
        ],
        visual: "centering",
      },
      {
        h: "If you're new",
        ps: [
          "Start by learning to pre-grade: buy a cheap loupe, check 10 of your own cards against PSA's published standards, then compare with recently graded copies on eBay. Submit a small test batch before trusting your eye on expensive cards.",
        ],
      },
    ],
  },
  {
    slug: "storage-and-protection",
    title: "Storing and protecting your collection",
    blurb: "Sleeves, toploaders, binders, and the environmental enemies of cardboard.",
    minutes: 5,
    sections: [
      {
        h: "The protection ladder",
        ps: [
          "Bulk: 1000-count cardboard boxes, unsleeved is fine. Anything worth a dollar: penny sleeve. Anything worth five: penny sleeve + toploader (or semi-rigid). Binder collections: side-loading pages in a zippered binder, stored upright — top-loading pages let cards fall out, and stacking binders flat imprints pages onto foils. Serious cards: sleeve + inner semi-rigid + magnetic one-touch, or send them to grading.",
        ],
        visual: "protection-ladder",
      },
      {
        h: "Environment",
        ps: [
          "Cardboard's enemies are sunlight (fades foils in weeks — never display raw cards in direct sun), humidity (warps and curls; aim for roughly 45–55% RH, use silica packs in closed containers), heat cycles (attics and cars are killers), and friction (don't shuffle collectibles). Sealed product has the same enemies plus one more: tape yellows and shrink-wrap tightens, so keep boxes out of light in stable, cool storage.",
          "For anything genuinely expensive, think like an archivist: acid-free storage, off the floor, documented, and ideally insured — homeowner's policies rarely cover collectibles by default.",
        ],
      },
    ],
  },
  {
    slug: "spotting-fakes",
    title: "Spotting fakes and scams",
    blurb: "Counterfeit tells, resealed product, and marketplace hygiene.",
    minutes: 6,
    sections: [
      {
        h: "Fake cards",
        ps: [
          "Most counterfeits fail basic checks: wrong card stock (too glossy, too flimsy, wrong snap when flexed gently), saturated or blurry printing, wrong font weights, missing texture on textured rarities, and wrong holo patterns. The classic test — a genuine card's black core layer visible on the edge — plus a side-by-side with a known-real card catches nearly everything.",
          "High-end vintage fakes are better, which is why expensive vintage trades increasingly happen in graded slabs. Learn to verify slabs too: check the cert number against the grader's database and compare label fonts and cases with photos of verified examples.",
        ],
      },
      {
        h: "Fake and tampered sealed product",
        ps: [
          "Resealing (opening product, removing hits, regluing) plagues loose vintage packs and cheap marketplace boxes. Defenses: buy sealed product from major retailers or established hobby shops; on marketplaces, insist on clear photos of seals and crimps; be suspicious of prices meaningfully under market — sealed product doesn't go on 40%-off sale from a stranger.",
          "Weighed loose packs are the other classic: vintage-era holos are heavier, so 'light' packs got sold to suckers. Rule of thumb: never buy loose vintage packs for opening odds, only as sealed collectibles from provenance you trust.",
        ],
      },
      {
        h: "Marketplace hygiene",
        ps: [
          "Buy singles from platforms with buyer protection (TCGplayer, eBay with authenticity guarantee at higher price points, or your LGS). Check seller feedback specifically on high-value items. For local cash deals, meet somewhere public and verify the card in hand. If a deal makes your heart race because it's so good, that is the scam working.",
        ],
      },
    ],
  },
  {
    slug: "how-prices-work",
    title: "How card prices actually work",
    blurb: "Where market price comes from, why charts move, and how to read them.",
    minutes: 6,
    sections: [
      {
        h: "Where our numbers come from",
        ps: [
          "PokéChase tracks TCGplayer, the largest English card marketplace. 'Market price' is TCGplayer's estimate of a card's going rate based on completed sales, weighted toward recent ones — it's a sales-derived number, not a seller's asking price. We snapshot it (plus the low/mid/high listing spread) daily for every card variant and sealed product, which is what powers the charts and the 7-day movers.",
          "Prices differ by variant — holo vs reverse holo vs 1st edition are separate markets — and everything quoted is Near Mint. Played-condition copies trade at steep discounts that widen for older cards.",
        ],
      },
      {
        h: "Why prices move",
        ps: [
          "New-set cycle: chase cards debut high on hype, then drift down for two to four months as supply gets opened ('the dip'), then stabilize; buying the top chase card in week one is almost always the top of the market. Reprints cap prices: The Pokémon Company reprints popular modern sets heavily. Rotation, competitive play results, social-media moments, and grading-population growth all move individual cards. Vintage moves on macro nostalgia cycles more than on events.",
          "Sealed follows its own curve: flat or negative while a set is in print, with appreciation only possible after printing genuinely stops — measured in years, not months.",
        ],
      },
      {
        h: "Reading a PokéChase chart",
        ps: [
          "Our history goes back about a year (and grows daily). Look for the shape, not the wiggle: a post-release glide-down that has flattened suggests the dip has played out; a slow steady climb on an older card suggests durable demand; a vertical spike usually means a social-media moment that will partially retrace. The 7-day and 30-day deltas on chase cards summarize the recent trend at a glance.",
          "None of this is financial advice — it's context so you don't overpay at hype peaks for cards you'd have loved just as much three months later.",
        ],
        visual: "live-chart",
      },
    ],
  },
  {
    slug: "collecting-strategies",
    title: "Choosing your lane: collecting strategies that work",
    blurb: "Master sets, character collecting, era focus, budgets, and staying sane.",
    minutes: 6,
    sections: [
      {
        h: "Pick a lane (you can change it)",
        ps: [
          "The hobby is too big to collect 'everything', and trying is the fastest route to burnout and an unfocused pile. Proven lanes: set completion (every card in one set you love), master sets (completion plus all secrets and reverses — a serious grind), character collecting (every Umbreon, every Gengar — endlessly popular), era collecting (e.g. everything WotC), art collecting (one favorite illustrator's cards), and binder-of-favorites (no rules, pure joy).",
          "Character and art collecting are the friendliest starts: clear goals, steady dopamine, and price points from fifty cents to whatever your ceiling is.",
        ],
        visual: "character-gallery:Umbreon",
      },
      {
        h: "Budget mechanics",
        ps: [
          "Set a monthly number you'd be comfortable spending on any other hobby, and treat singles as the default purchase. A useful discipline: before opening product, price the singles you actually want from that set — if the box costs more than the cards you'd be thrilled to own, buy the cards. Track what you own and what you paid; the portfolio features coming to PokéChase will do this automatically.",
          "Buy the card, not the story: 'this will be worth more later' is how every bagholder describes every purchase. If you'd still be happy owning it after a 40% price drop, it's a good collecting buy.",
        ],
      },
      {
        h: "A sensible first 90 days",
        ps: [
          "Month 1: read the Learn guides, browse eras, and shortlist the sets and characters that genuinely excite you. Month 2: buy your first singles NM from reputable sellers, sleeve everything, and open one cheap product for the fun of it. Month 3: define your lane, set the budget, and start your first real goal — a set page on this site makes a natural checklist. Ignore hype releases until the dip; they'll be cheaper and you'll be smarter.",
        ],
      },
    ],
  },
];
