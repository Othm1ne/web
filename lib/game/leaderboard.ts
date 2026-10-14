// Pure leaderboard ranking over finished-game entries (filtering happens in SQL, see lib/db/repo.ts).
import type { LeaderboardRow } from "../types";

export type Entry = {
  gameId: string;
  userId: string;
  handle: string;
  country: string | null;
  artistId: string;
  artistName: string;
  score: number;
  at: number;
};

export type Period = "day" | "week" | "all";
export type BoardFilter = { artistId?: string; country?: string; period?: Period };

/** One row per player (their best game; the earlier game wins ties), sorted by score. */
export function rankPlayers(entries: Entry[], youId?: string): LeaderboardRow[] {
  const best = new Map<string, Entry>();
  for (const e of entries) {
    const cur = best.get(e.userId);
    if (!cur || e.score > cur.score || (e.score === cur.score && e.at < cur.at)) best.set(e.userId, e);
  }
  const sorted = [...best.values()].sort((a, b) => b.score - a.score || a.at - b.at);
  // Equal scores share a rank (1, 2, 2, 4).
  const rows: LeaderboardRow[] = [];
  sorted.forEach((e, i) => {
    const rank = i > 0 && sorted[i - 1].score === e.score ? rows[i - 1].rank : i + 1;
    rows.push({ rank, handle: e.handle, score: e.score, country: e.country, isYou: e.userId === youId });
  });
  return rows;
}

/** Where a score would land among players' bests: 1 + the number of other players strictly above it. */
export function rankOf(score: number, entries: Entry[], youId: string): number {
  return rankPlayers(entries.filter((e) => e.userId !== youId)).filter((r) => r.score > score).length + 1;
}
