import { beforeEach, describe, expect, it } from "vitest";
import { answerRound, createGame, startRound } from "../game/engine";
import type { Track } from "../types";
import { type Db, migrate, pglite } from "./index";
import { insertLiveGame, loadLiveGame, updateLiveGame } from "./liveGames";

const pool: Track[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i}`, title: `T${i}`, artist: "A", album: "B", cover: "", previewUrl: `https://cdn/${i}`,
}));
const player = { id: "00000000-0000-4000-8000-000000000001", handle: "Me", country: null };

let db: Db;
beforeEach(async () => {
  db = await pglite();
  await migrate(db);
});

describe("live games", () => {
  it("round-trips a game, including its track map", async () => {
    const game = createGame(player, { id: "1", name: "A", genre: "", image: "" }, pool);
    await insertLiveGame(db, game);
    const loaded = (await loadLiveGame(db, game.id))!;
    expect(loaded.version).toBe(0);
    expect(loaded.game.rounds).toEqual(game.rounds);
    expect(loaded.game.tracks.get(game.rounds[0].trackId)?.previewUrl).toMatch(/^https:\/\/cdn\//);
    expect(await loadLiveGame(db, "not-a-uuid")).toBeNull();
  });

  it("saves progress and refuses a stale write (double tap)", async () => {
    const game = createGame(player, { id: "1", name: "A", genre: "", image: "" }, pool);
    await insertLiveGame(db, game);
    const a = (await loadLiveGame(db, game.id))!;
    const b = (await loadLiveGame(db, game.id))!;
    startRound(a.game, 0, 1000);
    answerRound(a.game, 0, null, 2000);
    await updateLiveGame(db, a);
    startRound(b.game, 0, 1000);
    await expect(updateLiveGame(db, b)).rejects.toThrow("wrong_round");
    const now = (await loadLiveGame(db, game.id))!;
    expect(now.version).toBe(1);
    expect(now.game.rounds[0].answer).toMatchObject({ optionId: null, points: 0 });
  });
});
