import { describe, it, expect } from "vitest";
import { descriptionIntro, parseOfficialContents } from "@/lib/contents";

const ETB = `Eevee & Friends Light Up with Stellar Colors!<br>
From fluffy and fiery to freezing and fanciful, Eevee and its many Evolutions hold a special place in the hearts of Pokémon Trainers across the land!

.<br><br>

The Pokémon TCG: Scarlet & Violet—Prismatic Evolutions Elite Trainer Box includes:<br>
• 9 Pokémon TCG: Scarlet & Violet—Prismatic Evolutions booster packs.
<br>
• 1 full-art foil promo card featuring Eevee.
<br>
• 65 card sleeves featuring Eevee as a Stellar Tera Pokémon.
<br>
• 45 Pokémon TCG Energy cards.
<br>
• A player’s guide to the Scarlet & Violet—Prismatic Evolutions expansion.
<br>
• 6 damage-counter dice.
<br>
• 1 competition-legal coin-flip die.
<br>
• 2 plastic condition markers.
<br>
• A collector’s box to hold everything, with 4 dividers to keep it organized.
<br>
• A code card for Pokémon Trading Card Game Live.`;

describe("parseOfficialContents", () => {
  it("extracts the full official bullet list", () => {
    const items = parseOfficialContents(ETB);
    expect(items).toHaveLength(10);
    expect(items[0]).toBe("9 Pokémon TCG: Scarlet & Violet—Prismatic Evolutions booster packs");
    expect(items[1]).toBe("1 full-art foil promo card featuring Eevee");
    expect(items[9]).toBe("A code card for Pokémon Trading Card Game Live");
  });

  it("returns empty for blurb-only descriptions", () => {
    expect(
      parseOfficialContents("Big excitement!<br>Open packs and have fun with Pokémon."),
    ).toEqual([]);
  });

  it("handles null and empty", () => {
    expect(parseOfficialContents(null)).toEqual([]);
    expect(parseOfficialContents("")).toEqual([]);
  });

  it("starts at bullets even without an includes line", () => {
    const items = parseOfficialContents("Cool box.<br>• 4 booster packs.<br>• 1 promo card.");
    expect(items).toEqual(["4 booster packs", "1 promo card"]);
  });
});

describe("descriptionIntro", () => {
  it("returns the blurb without the includes list", () => {
    const intro = descriptionIntro(ETB);
    expect(intro).toContain("Eevee & Friends Light Up");
    expect(intro).not.toContain("booster packs");
    expect(intro).not.toContain("includes:");
  });
  it("null for empty", () => {
    expect(descriptionIntro(null)).toBeNull();
  });
});
