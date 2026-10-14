import { beforeEach, describe, expect, it } from "vitest";
import { LEAD_MS, type LiveEvent, advance, buildRounds, gradeAnswer } from "../event/engine";
import type { Track, User } from "../types";
import { createEvent, joinEvent, loadAnswers, loadEvent, loadPlayers, saveAnswer, saveProgress } from "./events";
import { type Db, migrate, pglite } from "./index";
import { saveUser } from "./repo";

const tracks: Track[] = Array.from({ length: 4 }, (_, i) => ({
  id: `${i + 1}`, title: `Song ${i}`, artist: "A", album: "", cover: "", previewUrl: `https://cdn/${i}`,
}));
const user = (n: number, provider: User["provider"] = "guest"): User => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, handle: `P${n}`, provider, country: null,
});
const host = user(1, "google");

let db: Db;
let event: LiveEvent;
beforeEach(async () => {
  db = await pglite();
  await migrate(db);
  const draft = { id: "10000000-0000-4000-8000-000000000000", hostId: host.id, mode: "screen" as const, status: "lobby" as const,
    currentRound: -1, roundStartsAt: null, tracks, rounds: buildRounds(tracks).rounds, createdAt: 1_000 };
  await createEvent(db, draft, host, () => "TAKEN2");
  const codes = ["TAKEN2", "FRESH3"];
  const code = await createEvent(db, { ...draft, id: "20000000-0000-4000-8000-000000000000" }, host, () => codes.shift()!);
  expect(code).toBe("FRESH3"); // retried past the taken code
  event = (await loadEvent(db, "FRESH3"))!;
});

describe("event queries", () => {
  it("reads events whose JSON was stored double-encoded", async () => {
    await db.query(`update events set data = to_jsonb(data::text) where id = $1`, [event.id]);
    expect((await loadEvent(db, "FRESH3"))!.rounds).toEqual(event.rounds);
  });

  it("round-trips an event", () => {
    expect(event).toMatchObject({ code: "FRESH3", hostHandle: "P1", status: "lobby", currentRound: -1, roundStartsAt: null, createdAt: 1_000 });
    expect(event.rounds).toHaveLength(4);
    expect(event.tracks[0].previewUrl).toBe("https://cdn/0");
  });

  it("joins players once, plays rounds, and counts only finished rounds in scores", async () => {
    const [a, b] = [user(2), user(3)];
    for (const p of [a, b]) {
      await saveUser(db, p);
      await joinEvent(db, event.id, p);
    }
    await joinEvent(db, event.id, { ...a, handle: "Renamed" });
    expect((await loadPlayers(db, event.id, -1)).map((p) => p.handle).sort()).toEqual(["P3", "Renamed"]);

    expect(await saveProgress(db, event, advance(event, "lobby", 0))).toBe(true);
    expect(await saveProgress(db, event, advance(event, "lobby", 0))).toBe(false); // double click
    event = (await loadEvent(db, "FRESH3"))!;
    expect(event).toMatchObject({ status: "running", currentRound: 0, roundStartsAt: LEAD_MS });

    const r = event.rounds[0];
    const right = r.options.find((o) => o.trackId === r.trackId)!.id;
    await saveAnswer(db, event.id, 0, gradeAnswer(event, 0, right, a.id, LEAD_MS + 1000));
    await expect(saveAnswer(db, event.id, 0, gradeAnswer(event, 0, right, a.id, LEAD_MS + 2000))).rejects.toThrow("already_answered");
    expect(await loadAnswers(db, event.id, 0)).toEqual([{ userId: a.id, optionId: right, elapsedMs: 1000, correct: true, points: 100 }]);

    // Round 0 not counted while it is current; counted once the event moves on.
    expect((await loadPlayers(db, event.id, 0)).find((p) => p.userId === a.id)!.score).toBe(0);
    expect((await loadPlayers(db, event.id, 1)).find((p) => p.userId === a.id)!.score).toBe(100);
  });
});
