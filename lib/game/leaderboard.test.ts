import { describe, expect, it } from "vitest";
import { type Entry, rankOf, rankPlayers } from "./leaderboard";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
let n = 0;
const entry = (userId: string, score: number, extra: Partial<Entry> = {}): Entry => ({
  gameId: `g${n++}`,
  userId,
  handle: userId.toUpperCase(),
  country: "FR",
  artistId: "1",
  artistName: "A",
  score,
  at: NOW - DAY / 2,
  ...extra,
});

describe("leaderboard", () => {
  it("keeps each player's best game and shares ranks on ties", () => {
    const rows = rankPlayers([entry("a", 500), entry("a", 800), entry("b", 700), entry("c", 700), entry("d", 300)], "c");
    expect(rows.map((r) => [r.rank, r.handle, r.score])).toEqual([
      [1, "A", 800],
      [2, "B", 700],
      [2, "C", 700],
      [4, "D", 300],
    ]);
    expect(rows.find((r) => r.isYou)?.handle).toBe("C");
  });

  it("treats same handles from different players as different rows", () => {
    expect(rankPlayers([entry("x", 1, { handle: "Same" }), entry("y", 2, { handle: "Same" })])).toHaveLength(2);
  });

  it("ranks a score against other players' bests", () => {
    const entries = [entry("a", 800), entry("a", 900), entry("b", 600), entry("me", 990)];
    expect(rankOf(700, entries, "me")).toBe(2);
    expect(rankOf(950, entries, "me")).toBe(1);
    expect(rankOf(600, entries, "me")).toBe(2);
  });
});
