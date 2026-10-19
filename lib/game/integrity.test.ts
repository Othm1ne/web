import { describe, expect, it } from "vitest";
import type { Track } from "../types";
import { answerRound, createGame, startRound } from "./engine";
import { MAX_TOO_FAST, MIN_HUMAN_MS, unrankedReason } from "./integrity";

const pool: Track[] = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, title: `T${i}`, artist: "A", album: "", cover: "", previewUrl: "" }));
const me = { id: "u1", handle: "me", country: null };

/** Plays every round right, the first `fast` of them in 100 ms and the rest in 1.5 s. */
function play(fast: number, rightAnswers = true) {
  const game = createGame(me, { id: "1", name: "A", genre: "", image: "" }, pool);
  game.rounds.forEach((r, i) => {
    startRound(game, i, 0);
    const option = r.options.find((o) => (o.trackId === r.trackId) === rightAnswers)!;
    answerRound(game, i, option.id, i < fast ? 100 : 1500);
  });
  return game;
}

describe("unrankedReason", () => {
  it("ranks human-speed games, forgiving a couple of lucky taps", () => {
    expect(MIN_HUMAN_MS).toBeGreaterThan(100);
    expect(unrankedReason(play(0))).toBeNull();
    expect(unrankedReason(play(MAX_TOO_FAST))).toBeNull();
  });

  it("unranks a game with too many inhumanly fast right answers", () => {
    expect(unrankedReason(play(MAX_TOO_FAST + 1))).toBe("too_fast");
    expect(unrankedReason(play(10))).toBe("too_fast");
  });

  it("ignores fast wrong answers, which earn nothing", () => {
    expect(unrankedReason(play(10, false))).toBeNull();
  });
});
