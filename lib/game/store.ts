// Games in progress and finished results, both in Postgres (serverless instances share nothing).
import { getDb } from "../db";
import { type LoadedGame, insertLiveGame, loadLiveGame, updateLiveGame } from "../db/liveGames";
import * as repo from "../db/repo";
import type { GameSummary } from "../types";
import { Game, GameError, summarize, totalScore } from "./engine";
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
  const entries = await repo.bestEntries(await getDb(), { artistId: game.artist.id });
  const rows = rankPlayers(entries, game.player.id);
  return summarize(game, {
    rank: rankOf(totalScore(game), entries, game.player.id),
    players: rows.length,
    top: rows.slice(0, 3),
  });
}
