import { randomBytes, randomUUID } from "node:crypto";
import type { ArtistSummary, GameSummary, Player, PublicGame, RevealResult, RevealTrack, Track } from "../types";
import { GRACE_MS, OPTIONS_PER_ROUND, ROUND_MS, ROUNDS, pointsFor } from "./scoring";

export class GameError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

type Answer = { optionId: string | null; elapsedMs: number; correct: boolean; points: number };

export type Round = {
  trackId: string;
  options: { id: string; trackId: string }[];
  /** Key the clip is encrypted with (see clip.ts), released by startRound. Older games have none. */
  clipKey?: string;
  startedAt?: number;
  answer?: Answer;
};

export type Game = {
  id: string;
  player: Player;
  artist: ArtistSummary;
  tracks: Map<string, Track>;
  rounds: Round[];
  createdAt: number;
  finishedAt?: number;
};

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createGame(
  player: Player,
  artist: ArtistSummary,
  pool: Track[],
  rnd: () => number = Math.random,
  now = Date.now(),
): Game {
  if (pool.length < ROUNDS) throw new GameError("not_enough_tracks", 422);
  const answers = shuffle(pool, rnd).slice(0, ROUNDS);
  const tracks = new Map<string, Track>();
  const rounds = answers.map((answer) => {
    const distractors = shuffle(
      pool.filter((t) => t.id !== answer.id),
      rnd,
    ).slice(0, OPTIONS_PER_ROUND - 1);
    const choices = shuffle([answer, ...distractors], rnd);
    for (const t of choices) tracks.set(t.id, t);
    return {
      trackId: answer.id,
      // Option IDs are opaque so the client cannot tell which one is correct.
      options: choices.map((t) => ({ id: randomBytes(6).toString("hex"), trackId: t.id })),
      clipKey: randomBytes(32).toString("base64url"),
    };
  });
  return { id: randomUUID(), player, artist, tracks, rounds, createdAt: now };
}

export function currentRound(game: Game): number {
  return game.rounds.findIndex((r) => !r.answer);
}

function roundAt(game: Game, index: number): Round {
  if (index !== currentRound(game)) throw new GameError("wrong_round", 409);
  return game.rounds[index];
}

/**
 * Starts the round clock and hands over the key to the round's clip, so the clip can't be heard
 * before its clock runs. Idempotent, so reloading the page does not reset the timer.
 */
export function startRound(game: Game, index: number, now = Date.now()) {
  const round = roundAt(game, index);
  round.startedAt ??= now;
  return { startedAt: round.startedAt, roundMs: ROUND_MS, clipKey: round.clipKey ?? null };
}

const revealTrack = ({ title, artist, album, cover }: Track): RevealTrack => ({ title, artist, album, cover });

export function totalScore(game: Game): number {
  return game.rounds.reduce((sum, r) => sum + (r.answer?.points ?? 0), 0);
}

/** Grades an answer with the server clock. A null optionId means the player ran out of time. */
export function answerRound(game: Game, index: number, optionId: string | null, now = Date.now()): RevealResult {
  const round = roundAt(game, index);
  if (round.startedAt === undefined) throw new GameError("round_not_started", 409);
  const chosen = optionId === null ? undefined : round.options.find((o) => o.id === optionId);
  if (optionId !== null && !chosen) throw new GameError("bad_option");

  const raw = now - round.startedAt;
  const timedOut = raw > ROUND_MS + GRACE_MS;
  const elapsedMs = Math.min(raw, ROUND_MS);
  const correct = !timedOut && chosen?.trackId === round.trackId;
  const points = pointsFor(correct, elapsedMs);
  round.answer = { optionId: timedOut ? null : optionId, elapsedMs, correct, points };
  if (currentRound(game) === -1) game.finishedAt = now;

  return {
    correct,
    correctOptionId: round.options.find((o) => o.trackId === round.trackId)!.id,
    track: revealTrack(game.tracks.get(round.trackId)!),
    points,
    elapsedMs,
    total: totalScore(game),
    finished: game.finishedAt !== undefined,
  };
}

export function toPublicGame(game: Game): PublicGame {
  return {
    id: game.id,
    handle: game.player.handle,
    artist: game.artist,
    roundMs: ROUND_MS,
    finished: game.finishedAt !== undefined,
    rounds: game.rounds.map((r, index) => ({
      index,
      audioUrl: `/api/games/${game.id}/rounds/${index}/audio`,
      answered: r.answer !== undefined,
      options: r.options.map((o) => {
        const t = game.tracks.get(o.trackId)!;
        return { id: o.id, title: t.title, cover: t.cover };
      }),
    })),
  };
}

export function summarize(
  game: Game,
  board: Pick<GameSummary, "rank" | "players" | "top" | "unranked">,
): GameSummary {
  const answered = game.rounds.filter((r) => r.answer);
  return {
    id: game.id,
    handle: game.player.handle,
    artist: game.artist,
    score: totalScore(game),
    correctCount: answered.filter((r) => r.answer!.correct).length,
    totalRounds: game.rounds.length,
    avgMs: answered.length ? Math.round(answered.reduce((s, r) => s + r.answer!.elapsedMs, 0) / answered.length) : 0,
    ...board,
    rounds: answered.map((r) => ({
      ...revealTrack(game.tracks.get(r.trackId)!),
      correct: r.answer!.correct,
      points: r.answer!.points,
      elapsedMs: r.answer!.elapsedMs,
    })),
  };
}
