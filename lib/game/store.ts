// Live games stay in memory (they last minutes); finished games go to Postgres.
import { getDb } from "../db";
import * as repo from "../db/repo";
import type { GameSummary } from "../types";
import { Game, GameError, summarize, totalScore } from "./engine";
import { type BoardFilter, rankOf, rankPlayers } from "./leaderboard";

const GAME_TTL_MS = 3 * 60 * 60 * 1000;
const holder = globalThis as unknown as { __games?: Map<string, Game> };
const games = (holder.__games ??= new Map<string, Game>());

export function saveGame(game: Game) {
  const cutoff = Date.now() - GAME_TTL_MS;
  for (const [id, g] of games) if (g.createdAt < cutoff) games.delete(id);
  games.set(game.id, game);
}

export function getGame(id: string): Game {
  const game = games.get(id);
  if (!game) throw new GameError("game_not_found", 404);
  return game;
}

/** A game only its player can play; other sessions get the same 404 as a missing game. */
export function getOwnGame(id: string, userId: string): Game {
  const game = getGame(id);
  if (game.player.id !== userId) throw new GameError("game_not_found", 404);
  return game;
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
