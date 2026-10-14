import { describe, expect, it } from "vitest";
import type { Track } from "../types";
import { GameError, answerRound, createGame, startRound, toPublicGame } from "./engine";
import { isTitleMatch, normalizeTitle } from "./match";
import { ROUND_MS, pointsFor } from "./scoring";

describe("pointsFor", () => {
  it("follows 105 - 5/s, clamped to [55, 100]", () => {
    expect(pointsFor(true, 0)).toBe(100);
    expect(pointsFor(true, 2000)).toBe(95);
    expect(pointsFor(true, 7000)).toBe(70);
    expect(pointsFor(true, ROUND_MS)).toBe(55);
  });
  it("gives 0 when wrong or late", () => {
    expect(pointsFor(false, 500)).toBe(0);
    expect(pointsFor(true, ROUND_MS + 1)).toBe(0);
  });
});

describe("match", () => {
  it("strips version noise", () => {
    expect(normalizeTitle("Café (Remastered 2011)")).toBe("cafe");
    expect(normalizeTitle("Song Name - Live at Wembley")).toBe("song name");
    expect(normalizeTitle("Hello (feat. Someone)")).toBe("hello");
    expect(normalizeTitle("Harder Better Faster Stronger (The Neptunes Remix)")).toBe("harder better faster stronger");
    expect(normalizeTitle("Harder Better Faster Stronger (Alive 2007 Extended)")).toBe("harder better faster stronger");
    expect(normalizeTitle("Song - Instrumental")).toBe("song");
  });
  it("accepts small typos and rejects other titles", () => {
    expect(isTitleMatch("midnigt city", "Midnight City")).toBe(true);
    expect(isTitleMatch("the city", "Midnight City")).toBe(false);
  });
});

const pool: Track[] = Array.from({ length: 14 }, (_, i) => ({
  id: `t${i}`,
  title: `Track ${i}`,
  artist: "A",
  album: "B",
  cover: "",
  previewUrl: `https://example.com/${i}.m4a`,
}));
const artist = { id: "1", name: "A", genre: "Pop", image: "" };
const me = { id: "u1", handle: "me", country: null };

describe("engine", () => {
  it("builds 10 rounds of 4 distinct options with one correct answer", () => {
    const game = createGame(me, artist, pool);
    expect(game.rounds).toHaveLength(10);
    for (const r of game.rounds) {
      expect(new Set(r.options.map((o) => o.trackId)).size).toBe(4);
      expect(r.options.filter((o) => o.trackId === r.trackId)).toHaveLength(1);
    }
  });

  it("does not expose the answer in the public view", () => {
    const json = JSON.stringify(toPublicGame(createGame(me, artist, pool)));
    expect(json).not.toContain("trackId");
    expect(json).not.toContain("example.com");
  });

  it("scores with the server clock and enforces round order", () => {
    const game = createGame(me, artist, pool);
    expect(() => startRound(game, 1, 0)).toThrow(GameError);
    startRound(game, 0, 1000);
    const right = game.rounds[0].options.find((o) => o.trackId === game.rounds[0].trackId)!;
    const res = answerRound(game, 0, right.id, 3000);
    expect(res).toMatchObject({ correct: true, points: 95, total: 95 });
    expect(() => answerRound(game, 0, right.id, 3000)).toThrow(GameError);

    startRound(game, 1, 10_000);
    expect(answerRound(game, 1, null, 25_000)).toMatchObject({ correct: false, points: 0 });
  });

  it("refuses a too-small pool", () => {
    expect(() => createGame(me, artist, pool.slice(0, 5))).toThrow("not_enough_tracks");
  });
});
