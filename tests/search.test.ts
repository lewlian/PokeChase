import { beforeAll, describe, expect, it } from "vitest";
import { day, makeTestDb } from "./helpers/db";

/* searchAll with card-number support. Fixture:
 *   1: "Chansey"  113/165   2: "Chansey" 003/102 (padded numerator)
 *   3: "Chansey"  113/122   4: "Mew"     113/165
 *   5: "Charizard" TG12/TG30 (letter prefix, sort_number 12)
 *   6: "Pidgey"   12/102 (would collide with tg12's numeric part)
 */
let queries: typeof import("@/lib/queries");

beforeAll(async () => {
  const f = await makeTestDb();
  f.seedEra("era-a");
  f.seedSet(100, "era-a", { name: "Alpha Set" });
  f.seedCard(1, 100, { name: "Chansey", number: "113/165", sortNumber: 113 });
  f.seedCard(2, 100, { name: "Chansey", number: "003/102", sortNumber: 3 });
  f.seedCard(3, 100, { name: "Chansey", number: "113/122", sortNumber: 113 });
  f.seedCard(4, 100, { name: "Mew", number: "113/165", sortNumber: 113 });
  f.seedCard(5, 100, { name: "Charizard", number: "TG12/TG30", sortNumber: 12 });
  f.seedCard(6, 100, { name: "Pidgey", number: "12/102", sortNumber: 12 });
  f.seedCard(7, 100, { name: "Porygon2", number: "60/64", sortNumber: 60 });
  for (const id of [1, 2, 3, 4, 5, 6, 7]) f.seedSnap(id, "Normal", day(0), id);
  queries = await import("@/lib/queries");
});

const ids = (r: { cards: Array<{ productId: number }> }) =>
  r.cards.map((c) => c.productId).sort();

describe("searchAll card-number queries", () => {
  it("finds every card with an exact number", () => {
    expect(ids(queries.searchAll("113/165"))).toEqual([1, 4]);
  });

  it("narrows number matches by name", () => {
    expect(ids(queries.searchAll("chansey 113/165"))).toEqual([1]);
    expect(ids(queries.searchAll("mew 113/165"))).toEqual([4]);
  });

  it("matches all denominations on a bare numerator", () => {
    expect(ids(queries.searchAll("chansey 113"))).toEqual([1, 3]);
  });

  it("matches zero-padded numbers via sort_number", () => {
    expect(ids(queries.searchAll("chansey 3"))).toEqual([2]);
    expect(ids(queries.searchAll("3/102"))).toEqual([2]);
  });

  it("letter-prefixed numbers match by prefix without numeric collisions", () => {
    expect(ids(queries.searchAll("tg12/tg30"))).toEqual([5]);
    expect(ids(queries.searchAll("charizard tg12"))).toEqual([5]);
    // bare "12" hits the plain 12/102 and TG12's sort_number — but "tg12"
    // must NOT match Pidgey 12/102
    expect(ids(queries.searchAll("tg12"))).toEqual([5]);
  });

  it("plain name search still works", () => {
    expect(ids(queries.searchAll("chansey"))).toEqual([1, 2, 3]);
  });

  it("a real name ending in digits beats the loose number fallback", () => {
    expect(ids(queries.searchAll("porygon2"))).toEqual([7]); // by name, not as number 2
  });
});
