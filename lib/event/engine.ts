// Live events (Kahoot-style): pure rules. The host picks the songs; players join with a code.
// Nothing runs on a timer: the phase is derived from timestamps and answer counts on every
// read, which is what lets this work on serverless hosting.
import { randomBytes } from "node:crypto";
import { GameError } from "../game/engine";
import { normalizeTitle, similarity } from "../game/match";
import { GRACE_MS, OPTIONS_PER_ROUND, ROUND_MS, pointsFor } from "../game/scoring";
import type { Track } from "../types";

import type { EventMode, EventPhase } from "./types";

export type { EventMode, EventPhase };

export const MIN_SONGS = OPTIONS_PER_ROUND;
export const MAX_SONGS = 30;
/** Time between the host pressing "next" and the clip starting, so every screen gets the update first. */
export const LEAD_MS = 3_000;
/** Phone clocks drift a little; answers this early count as instant instead of being refused. */
const EARLY_TOLERANCE_MS = 300;
/** Events stop accepting players after this long. */
export const EVENT_TTL_MS = 12 * 60 * 60 * 1000;

export type EventRound = { trackId: string; options: { id: string; trackId: string }[] };

export type LiveEvent = {
  id: string;
  code: string;
  hostId: string;
  hostHandle: string;
  mode: EventMode;
  status: "lobby" | "running" | "finished";
  /** -1 while in the lobby. */
  currentRound: number;
  roundStartsAt: number | null;
  tracks: Track[];
  rounds: EventRound[];
  createdAt: number;
};

export type EventAnswer = { userId: string; optionId: string | null; elapsedMs: number; correct: boolean; points: number };

// No 0/O, 1/I/L: codes are read off a screen across a room.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function eventCode(bytes: Buffer = randomBytes(6)): string {
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** How alike two titles look: the better of spelling similarity and shared words. */
export function titleLikeness(a: string, b: string): number {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  const xs = new Set(x.split(" ").filter(Boolean));
  const ys = new Set(y.split(" ").filter(Boolean));
  const shared = [...xs].filter((w) => ys.has(w)).length;
  const words = xs.size + ys.size - shared;
  return Math.max(similarity(x, y), words ? shared / words : 0);
}

/**
 * Wrong options for one round, to make it hard: songs by the same artist first, the most
 * similar-looking titles first (with a little randomness so rounds don't feel scripted),
 * then the host's other songs if the artist has too few. Never two titles that would look
 * the same on screen.
 */
export function pickDistractors(answer: Track, sameArtist: Track[], others: Track[], rnd: () => number): Track[] {
  const seen = [normalizeTitle(answer.title)];
  // Another version of a song already shown is the same music, so it would be an unfair
  // option. Tags like "(Live)" are stripped by normalizeTitle; this also catches untagged
  // extras ("Hey Jude Take 2"). Single-word titles are exempt ("One" vs "One More Time").
  const startsWithTitle = (long: string, short: string) => short.includes(" ") && long.startsWith(`${short} `);
  const sameSong = (key: string) => seen.some((s) => s === key || startsWithTitle(key, s) || startsWithTitle(s, key));
  const picked: Track[] = [];
  const rank = (list: Track[]) =>
    list
      .map((t) => ({ t, score: titleLikeness(answer.title, t.title) + rnd() * 0.15 }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.t);
  for (const t of [...rank(sameArtist), ...rank(others)]) {
    if (picked.length === OPTIONS_PER_ROUND - 1) break;
    const key = normalizeTitle(t.title);
    if (!key || t.title.includes(" / ") || sameSong(key)) continue;
    seen.push(key);
    picked.push(t);
  }
  if (picked.length < OPTIONS_PER_ROUND - 1) throw new GameError("not_enough_songs", 422);
  return picked;
}

/**
 * One round per host song, in the host's order. `catalog` maps an artist id to that artist's
 * songs (fetched by the caller; may be missing). Returns the rounds and every track they use.
 */
export function buildRounds(
  tracks: Track[],
  catalog: Map<string, Track[]> = new Map(),
  rnd: () => number = Math.random,
): { rounds: EventRound[]; tracks: Track[] } {
  if (tracks.length < MIN_SONGS) throw new GameError("not_enough_songs", 422);
  if (tracks.length > MAX_SONGS) throw new GameError("too_many_songs", 422);
  // Two songs with the same title would make two identical-looking options.
  if (new Set(tracks.map((t) => normalizeTitle(t.title))).size !== tracks.length) throw new GameError("duplicate_songs", 422);
  const used = new Map(tracks.map((t) => [t.id, t]));
  const rounds = tracks.map((answer) => {
    const hostOthers = tracks.filter((t) => t.id !== answer.id);
    const sameArtist = answer.artistId
      ? [...(catalog.get(answer.artistId) ?? []), ...hostOthers.filter((t) => t.artistId === answer.artistId)].filter(
          (t) => t.id !== answer.id,
        )
      : [];
    const wrong = pickDistractors(answer, sameArtist, hostOthers, rnd);
    for (const t of wrong) used.set(t.id, t);
    return {
      trackId: answer.id,
      options: shuffle([answer, ...wrong], rnd).map((t) => ({ id: randomBytes(6).toString("hex"), trackId: t.id })),
    };
  });
  return { rounds, tracks: [...used.values()] };
}

export const roundDeadline = (event: LiveEvent) => (event.roundStartsAt ?? 0) + ROUND_MS + GRACE_MS;

export function phaseOf(event: LiveEvent, answered: number, players: number, now: number): EventPhase {
  if (event.status === "lobby") return "lobby";
  if (event.status === "finished") return "finished";
  const startsAt = event.roundStartsAt ?? 0;
  if (now < startsAt) return "countdown";
  if (now <= roundDeadline(event) && (players === 0 || answered < players)) return "question";
  return "reveal";
}

/** Grades an answer with the server clock. Throws unless the round is open. */
export function gradeAnswer(event: LiveEvent, round: number, optionId: string | null, userId: string, now: number): EventAnswer {
  if (event.status !== "running" || round !== event.currentRound) throw new GameError("wrong_round", 409);
  const startsAt = event.roundStartsAt ?? 0;
  if (now < startsAt - EARLY_TOLERANCE_MS) throw new GameError("round_not_started", 409);
  if (now > roundDeadline(event)) throw new GameError("round_over", 409);
  const r = event.rounds[round];
  const chosen = optionId === null ? undefined : r.options.find((o) => o.id === optionId);
  if (optionId !== null && !chosen) throw new GameError("bad_option");
  const elapsedMs = Math.max(0, Math.min(now - startsAt, ROUND_MS));
  const correct = chosen?.trackId === r.trackId;
  return { userId, optionId, elapsedMs, correct, points: pointsFor(correct, elapsedMs) };
}

/** The host moves on: from the lobby or a reveal to the next round, or to the final results. */
export function advance(event: LiveEvent, phase: EventPhase, now: number): Pick<LiveEvent, "status" | "currentRound" | "roundStartsAt"> {
  if (phase !== "lobby" && phase !== "reveal") throw new GameError("not_ready", 409);
  const next = event.currentRound + 1;
  if (next >= event.rounds.length) return { status: "finished", currentRound: event.currentRound, roundStartsAt: event.roundStartsAt };
  return { status: "running", currentRound: next, roundStartsAt: now + LEAD_MS };
}
