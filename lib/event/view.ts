// Builds what one viewer may see of a live event. Pure, so the hiding rules are unit-tested.
import { ROUND_MS } from "../game/scoring";
import { type EventAnswer, type LiveEvent, phaseOf, roundDeadline } from "./engine";
import type { EventView, StandingRow } from "./types";

/** score counts finished rounds only; the current round's points are added once it is revealed. */
export type EventPlayer = { userId: string; handle: string; score: number; joinedAt: number };

const STANDINGS_SHOWN = 10;

function rankPlayers(players: EventPlayer[], viewerId: string | null): (StandingRow & { userId: string })[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  const rows: (StandingRow & { userId: string })[] = [];
  sorted.forEach((p, i) => {
    const rank = i > 0 && sorted[i - 1].score === p.score ? rows[i - 1].rank : i + 1;
    rows.push({ rank, handle: p.handle, score: p.score, isYou: p.userId === viewerId, userId: p.userId });
  });
  return rows;
}

export function eventView(
  event: LiveEvent,
  players: EventPlayer[],
  answers: EventAnswer[],
  viewerId: string | null,
  now: number,
): EventView {
  const role = viewerId === event.hostId ? "host" : players.some((p) => p.userId === viewerId) ? "player" : "visitor";
  const phase = phaseOf(event, answers.length, players.length, now);
  const revealed = phase === "reveal" || phase === "finished";
  const roundPoints = new Map(answers.map((a) => [a.userId, a.points]));
  const scored = revealed ? players.map((p) => ({ ...p, score: p.score + (roundPoints.get(p.userId) ?? 0) })) : players;
  const ranked = rankPlayers(scored, viewerId);
  const me = ranked.find((r) => r.isYou);
  const standings = ranked.slice(0, STANDINGS_SHOWN).map(({ rank, handle, score, isYou }) => ({ rank, handle, score, isYou }));

  const index = event.currentRound;
  const r = index >= 0 ? event.rounds[index] : undefined;
  const tracks = new Map(event.tracks.map((t) => [t.id, t]));
  // Screen mode: only the host's screen plays music. Phones mode: every player's phone does.
  const hears = event.mode === "screen" ? role === "host" : role === "player";
  const audio = (i: number) =>
    hears && i >= 0 && i < event.rounds.length ? `/api/events/${event.code}/rounds/${i}/audio` : null;

  let round: EventView["round"] = null;
  if (r && phase !== "finished") {
    const counts: Record<string, number> = Object.fromEntries(r.options.map((o) => [o.id, 0]));
    for (const a of answers) if (a.optionId) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
    const answer = tracks.get(r.trackId)!;
    round = {
      options: r.options.map((o) => {
        const t = tracks.get(o.trackId)!;
        return { id: o.id, title: t.title, cover: t.cover };
      }),
      answered: answers.length,
      reveal: revealed
        ? {
            correctOptionId: r.options.find((o) => o.trackId === r.trackId)!.id,
            track: { title: answer.title, artist: answer.artist, album: answer.album, cover: answer.cover },
            counts,
          }
        : null,
    };
  }

  const mine = answers.find((a) => a.userId === viewerId);
  return {
    code: event.code,
    mode: event.mode,
    role,
    hostHandle: event.hostHandle,
    phase,
    serverNow: now,
    roundIndex: index,
    totalRounds: event.rounds.length,
    startsAt: event.status === "running" ? event.roundStartsAt : null,
    deadline: event.status === "running" ? roundDeadline(event) : null,
    roundMs: ROUND_MS,
    playerCount: players.length,
    standings,
    audio: phase === "finished" ? { current: null, next: null } : { current: audio(index), next: audio(index + 1) },
    round,
    you:
      role === "player" && me
        ? {
            handle: me.handle,
            score: me.score,
            rank: me.rank,
            answer: mine
              ? {
                  optionId: mine.optionId,
                  correct: revealed ? mine.correct : null,
                  points: revealed ? mine.points : null,
                }
              : null,
          }
        : null,
  };
}
