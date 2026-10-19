import { beforeEach, describe, expect, it } from "vitest";
import { answerRound, createGame, startRound } from "../game/engine";
import type { Track, User } from "../types";
import { type Db, migrate, pglite } from "./index";
import { bestEntries, playedArtists, recordResult, saveUser, signInGoogle } from "./repo";

const DAY = 86_400_000;
const pool: Track[] = Array.from({ length: 12 }, (_, i) => ({
  id: `t${i}`, title: `T${i}`, artist: "A", album: "B", cover: "", previewUrl: "",
}));
const guest = (id: string, country: string | null = "FR"): User => ({ id, handle: `H-${id.slice(0, 4)}`, provider: "guest", country });
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Plays a game where the first `correct` rounds are answered right after 1 s (100 points each). */
function play(user: User, artistId: string, correct: number, finishedAt: number, elapsedMs = 1000) {
  const game = createGame(user, { id: artistId, name: `Artist ${artistId}`, genre: "", image: "" }, pool, Math.random, finishedAt - 60_000);
  game.rounds.forEach((r, i) => {
    startRound(game, i, finishedAt - elapsedMs);
    const option = r.options.find((o) => (i < correct ? o.trackId === r.trackId : o.trackId !== r.trackId))!;
    answerRound(game, i, option.id, finishedAt);
  });
  return game;
}

let db: Db;
beforeEach(async () => {
  db = await pglite();
  await migrate(db);
  await migrate(db); // idempotent
});

describe("repo", () => {
  it("keeps each player's best game and filters by artist, country and period", async () => {
    const now = 100 * DAY;
    const [a, b, c] = [guest(uid(1)), guest(uid(2), "US"), guest(uid(3))];
    for (const u of [a, b, c]) await saveUser(db, u);
    await recordResult(db, play(a, "1", 3, now - 2 * DAY));
    await recordResult(db, play(a, "1", 7, now - DAY / 2));
    await recordResult(db, play(b, "1", 5, now - DAY / 2));
    await recordResult(db, play(c, "2", 9, now - 10 * DAY));

    const scores = async (f: Parameters<typeof bestEntries>[1]) =>
      Object.fromEntries((await bestEntries(db, f, now)).map((e) => [e.handle, e.score]));
    expect(await scores({ artistId: "1" })).toEqual({ [a.handle]: 700, [b.handle]: 500 });
    expect(await scores({ country: "FR" })).toEqual({ [a.handle]: 700, [c.handle]: 900 });
    expect(await scores({ artistId: "1", period: "day" })).toEqual({ [a.handle]: 700, [b.handle]: 500 });
    expect(await scores({ period: "week" })).toEqual({ [a.handle]: 700, [b.handle]: 500 });
    expect(await playedArtists(db)).toEqual([{ id: "1", name: "Artist 1" }, { id: "2", name: "Artist 2" }]);
  });

  it("keeps inhumanly fast games off the leaderboard", async () => {
    const [human, bot] = [guest(uid(1)), guest(uid(2))];
    await recordResult(db, play(human, "1", 6, Date.now()));
    await recordResult(db, play(bot, "1", 10, Date.now(), 50));
    expect((await bestEntries(db, { artistId: "1" })).map((e) => e.handle)).toEqual([human.handle]);
  });

  it("records a game once, even for a session without a user row", async () => {
    const game = play(guest(uid(9)), "1", 2, Date.now());
    await recordResult(db, game);
    await recordResult(db, game);
    expect(await bestEntries(db, {})).toHaveLength(1);
  });

  it("shows renamed handles everywhere", async () => {
    const a = guest(uid(1));
    await saveUser(db, a);
    await recordResult(db, play(a, "1", 1, Date.now()));
    await saveUser(db, { ...a, handle: "Renamed" });
    expect((await bestEntries(db, {}))[0].handle).toBe("Renamed");
  });

  it("links Google to the current guest, then returns that player on later sign-ins", async () => {
    const g = guest(uid(1));
    await saveUser(db, g);
    const first = await signInGoogle(db, { sub: "google-1", email: "a@x.com" }, g, "Fallback");
    expect(first).toEqual({ ...g, provider: "google" });

    // Signing in later from another device (a different guest) returns the original player.
    const other = guest(uid(2));
    expect((await signInGoogle(db, { sub: "google-1", email: "a@x.com" }, other, "Fallback")).id).toBe(g.id);

    // A guest already linked to one Google account is not taken over by a second account.
    const second = await signInGoogle(db, { sub: "google-2", email: null }, first, "Fallback");
    expect(second.id).not.toBe(g.id);
    expect(second.provider).toBe("google");

    // No guest at all: a fresh player with the fallback handle.
    expect((await signInGoogle(db, { sub: "google-3", email: null }, null, "Fallback")).handle).toBe("Fallback");
  });
});
