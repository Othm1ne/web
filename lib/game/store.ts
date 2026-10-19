// Games in progress and finished results, both in Postgres (serverless instances share nothing).
import { getDb } from "../db";
import { type LoadedGame, countRecentGames, insertLiveGame, loadLiveGame, updateLiveGame } from "../db/liveGames";
import * as repo from "../db/repo";
import type { GameSummary } from "../types";
import { Game, GameError, summarize, totalScore } from "./engine";
import { MAX_GAMES_PER_HOUR, unrankedReason } from "./integrity";
import { type PlayerStats, isTimeZone, levelFor, streakFor } from "./progress";
import { type BoardFilter, rankOf, rankPlayers } from "./leaderboard";

export type { LoadedGame };

export async function saveNewGame(game: Game) {
  await insertLiveGame(await getDb(), game);
}

export async function getGame(id: string): Promise<LoadedGame> {
  const loaded = await loadLiveGame(await getDb(), id);
  if (!loaded) throw new GameError("game_not_found", 404);
  return loaded;
}

/** A game only its player can play; other sessions get the same 404 as a missing game. */
export async function getOwnGame(id: string, userId: string): Promise<LoadedGame> {
  const loaded = await getGame(id);
  if (loaded.game.player.id !== userId) throw new GameError("game_not_found", 404);
  return loaded;
}

/** Persists changes made to a loaded game; fails with 409 if it changed meanwhile. */
export async function saveGame(loaded: LoadedGame) {
  await updateLiveGame(await getDb(), loaded);
}

export async function recordResult(game: Game) {
  await repo.recordResult(await getDb(), game);
}

export async function leaderboard(filter: BoardFilter, youId?: string, limit = 50) {
  const db = await getDb();
  const [entries, artists] = await Promise.all([repo.bestEntries(db, filter), repo.playedArtists(db)]);
  const rows = rankPlayers(entries, youId);
  return { players: rows.length, top: rows.slice(0, limit), you: rows.find((r) => r.isYou) ?? null, artists };
}

export async function summaryFor(game: Game): Promise<GameSummary> {
  if (game.finishedAt === undefined) throw new GameError("game_not_finished", 409);
  const db = await getDb();
  const [entries, previousBest] = await Promise.all([
    repo.bestEntries(db, { artistId: game.artist.id }),
    repo.previousBest(db, game.player.id, game.artist.id, game.id),
  ]);
  const rows = rankPlayers(entries, game.player.id);
  return summarize(game, {
    rank: rankOf(totalScore(game), entries, game.player.id),
    players: rows.length,
    top: rows.slice(0, 3),
    unranked: unrankedReason(game),
    previousBest,
  });
}

/**
 * Level, daily streak and best score for the player's header chip and progress card. The streak
 * counts days in the player's time zone (falling back to UTC for an unknown one).
 */
export async function statsFor(userId: string, timeZone = "UTC", now = Date.now()): Promise<PlayerStats> {
  const zone = isTimeZone(timeZone) ? timeZone : "UTC";
  const { xp, best, days } = await repo.playerTotals(await getDb(), userId, zone, now);
  return { ...levelFor(xp), ...streakFor(days, now, zone), best };
}

/** Refuses a new solo game once the player has started too many in the last hour. */
export async function assertCanStartGame(userId: string) {
  if ((await countRecentGames(await getDb(), userId, 3_600_000)) >= MAX_GAMES_PER_HOUR) {
    throw new GameError("too_many_games", 429);
  }
}
