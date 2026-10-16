import { describe, expect, it } from "vitest";
import { GRACE_MS, ROUND_MS } from "../game/scoring";
import type { Track } from "../types";
import { LEAD_MS, type LiveEvent, advance, buildRounds, eventCode, gradeAnswer, phaseOf, pickDistractors } from "./engine";
import { type EventPlayer, eventView } from "./view";

const tracks: Track[] = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i}`, title: `Song ${i}`, artist: `Artist ${i}`, album: "", cover: "", previewUrl: `https://cdn/${i}.m4a`,
}));

function liveEvent(mode: LiveEvent["mode"] = "screen"): LiveEvent {
  return {
    id: "e1", code: "ABC234", hostId: "host", hostHandle: "DJ", mode, status: "lobby",
    currentRound: -1, roundStartsAt: null, tracks, rounds: buildRounds(tracks).rounds, createdAt: 0,
  };
}
const players: EventPlayer[] = [
  { userId: "p1", handle: "Ann", score: 0, joinedAt: 1 },
  { userId: "p2", handle: "Bob", score: 0, joinedAt: 2 },
];
const correctId = (e: LiveEvent) => e.rounds[e.currentRound].options.find((o) => o.trackId === e.rounds[e.currentRound].trackId)!.id;
const wrongId = (e: LiveEvent) => e.rounds[e.currentRound].options.find((o) => o.trackId !== e.rounds[e.currentRound].trackId)!.id;

describe("event engine", () => {
  it("makes readable 6-character codes", () => {
    expect(eventCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("builds one round per song in order, with options from the host's list", () => {
    const { rounds } = buildRounds(tracks);
    expect(rounds.map((r) => r.trackId)).toEqual(tracks.map((t) => t.id));
    for (const r of rounds) {
      expect(new Set(r.options.map((o) => o.trackId)).size).toBe(4);
      expect(r.options.some((o) => o.trackId === r.trackId)).toBe(true);
    }
    expect(rounds.every((r) => r.startSec === 0)).toBe(true);
    expect(() => buildRounds(tracks.slice(0, 3))).toThrow("not_enough_songs");
    expect(() => buildRounds([...tracks, tracks[0]])).toThrow("duplicate_songs");
  });

  it("prefers same-artist songs with look-alike titles as wrong options", () => {
    const song = (id: string, title: string, artistId = "daft"): Track => ({ id, title, artist: "Daft Punk", album: "", cover: "", previewUrl: "", artistId });
    const answer = song("a", "One More Time");
    const catalog = [
      song("c1", "One More Time (Radio Edit)"), // same song: never offered
      song("c7", "One More Time / Aerodynamic (Live)"), // medley containing it
      song("c8", "One More Time - Romanthony's Unplugged"),
      song("c9", "Around the World (Extended Club Remix)"), // a second version of another option
      song("c2", "Around the World"),
      song("c3", "One Last Time"),
      song("c4", "More Time"),
      song("c5", "Digital Love"),
      song("c6", "Too Long"),
    ];
    const hostSongs = [song("h1", "Hello", "adele"), song("h2", "Halo", "beyonce"), song("h3", "Help!", "beatles")];
    const titles = pickDistractors(answer, catalog, hostSongs, () => 0).map((t) => t.title);
    expect(titles).toHaveLength(3);
    expect(titles.filter((t) => t.includes("One More Time"))).toEqual([]);
    expect(titles.filter((t) => t.startsWith("Around the World")).length).toBeLessThanOrEqual(1);
    expect(titles.slice(0, 2).sort()).toEqual(["More Time", "One Last Time"]);
    expect(titles.every((t) => catalog.some((c) => c.title === t))).toBe(true);

    // An artist with too few songs is topped up from the host's list.
    expect(pickDistractors(answer, [song("c4", "More Time")], hostSongs, () => 0)).toHaveLength(3);

    // buildRounds stores the catalog songs it used so the view can show them.
    const hosted = [answer, ...hostSongs];
    const built = buildRounds(hosted, { catalog: new Map([["daft", catalog]]), rnd: () => 0.5 });
    const optionIds = built.rounds[0].options.map((o) => o.trackId);
    expect(optionIds.filter((id) => id.startsWith("c"))).toHaveLength(3);
    expect(optionIds.every((id) => built.tracks.some((t) => t.id === id))).toBe(true);
  });

  it("keeps the host's chosen clip start for each round", () => {
    const { rounds } = buildRounds(tracks, { starts: new Map([["t1", 12], ["t3", 20]]) });
    expect(rounds.map((r) => r.startSec)).toEqual([0, 12, 0, 20, 0]);
    expect(() => buildRounds(tracks, { starts: new Map([["t0", 21]]) })).toThrow("bad_clip_start");
    expect(() => buildRounds(tracks, { starts: new Map([["t0", -1]]) })).toThrow("bad_clip_start");
  });

  it("derives phases from the clock and answer count", () => {
    const e = liveEvent();
    expect(phaseOf(e, 0, 2, 0)).toBe("lobby");
    Object.assign(e, advance(e, "lobby", 1000));
    expect(e.roundStartsAt).toBe(1000 + LEAD_MS);
    expect(phaseOf(e, 0, 2, 2000)).toBe("countdown");
    expect(phaseOf(e, 1, 2, 5000)).toBe("question");
    expect(phaseOf(e, 2, 2, 5000)).toBe("reveal"); // everyone answered
    expect(phaseOf(e, 1, 2, 4000 + ROUND_MS + GRACE_MS + 1)).toBe("reveal"); // time's up
    expect(() => advance(e, "question", 5000)).toThrow("not_ready");
  });

  it("grades with the server clock and only while the round is open", () => {
    const e = liveEvent();
    Object.assign(e, advance(e, "lobby", 0));
    const start = LEAD_MS;
    expect(() => gradeAnswer(e, 0, correctId(e), "p1", start - 1000)).toThrow("round_not_started");
    expect(gradeAnswer(e, 0, correctId(e), "p1", start - 100)).toMatchObject({ elapsedMs: 0, points: 100 });
    expect(gradeAnswer(e, 0, correctId(e), "p1", start + 2000)).toMatchObject({ correct: true, points: 95 });
    expect(gradeAnswer(e, 0, wrongId(e), "p1", start + 2000)).toMatchObject({ correct: false, points: 0 });
    expect(() => gradeAnswer(e, 1, correctId(e), "p1", start + 2000)).toThrow("wrong_round");
    expect(() => gradeAnswer(e, 0, correctId(e), "p1", start + ROUND_MS + GRACE_MS + 1)).toThrow("round_over");
  });

  it("finishes after the last round", () => {
    const e = liveEvent();
    Object.assign(e, { status: "running", currentRound: tracks.length - 1, roundStartsAt: 0 });
    expect(advance(e, "reveal", 99_999).status).toBe("finished");
  });
});

describe("event view", () => {
  it("hides the answer and the current round's points until the reveal", () => {
    const e = liveEvent("phones");
    Object.assign(e, advance(e, "lobby", 0));
    const t = LEAD_MS + 1000;
    const a1 = gradeAnswer(e, 0, correctId(e), "p1", t);
    const view = eventView(e, players, [a1], "p1", t);
    expect(view.phase).toBe("question");
    expect(view.round!.reveal).toBeNull();
    expect(view.you!.answer).toEqual({ optionId: a1.optionId, correct: null, points: null });
    expect(view.standings.map((r) => r.score)).toEqual([0, 0]);
    expect(JSON.stringify(view)).not.toContain("cdn/");
    expect(JSON.stringify(view)).not.toContain("trackId");

    const a2 = gradeAnswer(e, 0, wrongId(e), "p2", t);
    const after = eventView(e, players, [a1, a2], "p1", t);
    expect(after.phase).toBe("reveal");
    expect(after.round!.reveal!.correctOptionId).toBe(correctId(e));
    expect(after.you).toMatchObject({ score: 100, rank: 1, answer: { correct: true, points: 100 } });
  });

  it("tells the playing device where the current clip starts", () => {
    const e = liveEvent("phones");
    e.rounds[0].startSec = 15;
    Object.assign(e, advance(e, "lobby", 0));
    expect(eventView(e, players, [], "p1", 0).audio).toMatchObject({ current: expect.stringMatching(/rounds\/0\/audio$/), startSec: 15 });
    delete e.rounds[0].startSec; // events created before clip starts existed
    expect(eventView(e, players, [], "p1", 0).audio.startSec).toBe(0);
  });

  it("gives clips only to the device that plays them", () => {
    const screen = liveEvent("screen");
    expect(eventView(screen, players, [], "host", 0).audio.next).toMatch(/rounds\/0\/audio$/);
    expect(eventView(screen, players, [], "p1", 0).audio.next).toBeNull();
    const phones = liveEvent("phones");
    expect(eventView(phones, players, [], "host", 0).audio.next).toBeNull();
    expect(eventView(phones, players, [], "p1", 0).audio.next).toMatch(/rounds\/0\/audio$/);
    expect(eventView(phones, players, [], "stranger", 0)).toMatchObject({ role: "visitor", audio: { next: null }, you: null });
  });
});
