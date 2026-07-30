import { describe, it, expect } from "vitest";
import { eraForGroup, ERAS } from "@/lib/eras";

describe("eraForGroup", () => {
  const cases: Array<[string, string | null, string]> = [
    ["Base Set", "1999-01-09", "original"],
    ["Base Set (Shadowless)", "1999-01-09", "original"],
    ["Jungle", "1999-06-16", "original"],
    ["Fossil", "1999-10-10", "original"],
    ["Base Set 2", "2000-02-24", "original"],
    ["Team Rocket", "2000-04-24", "original"],
    ["Gym Heroes", "2000-08-14", "original"],
    ["Neo Genesis", "2000-12-16", "neo"],
    ["Neo Destiny", "2002-02-28", "neo"],
    ["Legendary Collection", "2002-05-24", "neo"],
    ["Expedition", "2002-09-15", "e-card"],
    ["Aquapolis", "2003-01-15", "e-card"],
    ["Skyridge", "2003-05-12", "e-card"],
    ["EX Ruby and Sapphire", "2003-07-01", "ex"],
    ["EX Power Keepers", "2007-02-14", "ex"],
    ["POP Series 5", "2007-03-01", "ex"],
    ["Diamond and Pearl", "2007-05-01", "diamond-pearl"],
    ["Diamond and Pearl Promos", "2007-05-01", "diamond-pearl"],
    ["Platinum", "2009-02-11", "platinum"],
    ["Platinum: Arceus", "2009-11-04", "platinum"],
    ["HeartGold SoulSilver", "2010-02-10", "hgss"],
    ["Call of Legends", "2011-02-09", "hgss"],
    ["Black and White", "2011-04-25", "black-white"],
    ["Black and White Promos", "2011-03-01", "black-white"],
    ["XY", "2014-02-05", "xy"],
    ["XY - Evolutions", "2016-11-02", "xy"],
    ["Generations", "2016-02-22", "xy"],
    ["Sun and Moon", "2017-02-03", "sun-moon"],
    ["SM - Team Up", "2019-02-01", "sun-moon"],
    ["Hidden Fates", "2019-08-23", "sun-moon"],
    ["Shining Legends", "2017-10-06", "sun-moon"],
    ["SWSH01: Sword & Shield Base Set", "2020-02-07", "sword-shield"],
    ["SWSH12: Silver Tempest", "2022-11-11", "sword-shield"],
    ["Celebrations", "2021-10-08", "sword-shield"],
    ["Shining Fates", "2021-02-19", "sword-shield"],
    ["Champion's Path", "2020-09-25", "sword-shield"],
    ["Pokemon GO", "2022-07-01", "sword-shield"],
    ["Crown Zenith", "2023-01-20", "sword-shield"],
    ["SV01: Scarlet & Violet Base Set", "2023-03-31", "scarlet-violet"],
    ["SV: Prismatic Evolutions", "2025-01-17", "scarlet-violet"],
    ["SV08: Surging Sparks", "2024-11-08", "scarlet-violet"],
    ["Pokemon Card 151", "2023-09-22", "scarlet-violet"],
    ["ME01: Mega Evolution", "2025-09-26", "mega-evolution"],
    ["ME05: Pitch Black", "2026-07-17", "mega-evolution"],
    ["ME: 30th Celebration", "2026-09-16", "mega-evolution"],
    ["McDonald's 25th Anniversary Promos", "2021-10-01", "other"],
    ["Trick or Trade BOOster Bundle 2023", "2023-09-01", "other"],
    ["SWSH: Sword & Shield Promo Cards", "2020-02-07", "sword-shield"],
    ["Jumbo Cards", null, "other"],
    ["World Championship Decks", "2005-08-01", "other"],
  ];

  it.each(cases)("%s → %s", (name, publishedOn, expected) => {
    expect(eraForGroup({ name, publishedOn })).toBe(expected);
  });

  it("every mapped era id exists in ERAS", () => {
    const ids = new Set(ERAS.map((e) => e.id));
    for (const [name, publishedOn] of cases) {
      expect(ids.has(eraForGroup({ name, publishedOn }))).toBe(true);
    }
  });

  it("unknown set with no date falls back to other", () => {
    expect(eraForGroup({ name: "Mystery Product Line" })).toBe("other");
  });

  it("unknown 2026 set falls back to mega-evolution by year", () => {
    expect(eraForGroup({ name: "Totally New Set", publishedOn: "2026-12-01" })).toBe(
      "mega-evolution",
    );
  });
});
