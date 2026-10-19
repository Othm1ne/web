// Leaderboard integrity: games that no human could have played stay off the leaderboard, and
// players can't start games without limit (quitting until a lucky draw).
import type { Game } from "./engine";

/**
 * Faster than anyone can hear a clip and tap. The server clock also counts the network round
 * trip and the clip's decryption, so a real player is always well above this.
 */
export const MIN_HUMAN_MS = 300;
/** A lucky early tap or two is forgiven; more than this many is a script. */
export const MAX_TOO_FAST = 2;
/** Solo games a player can start per hour (a full game takes over two minutes). */
export const MAX_GAMES_PER_HOUR = 30;

export type UnrankedReason = "too_fast";

/** Why a game shouldn't count on the leaderboard, or null if it should. */
export function unrankedReason(game: Game): UnrankedReason | null {
  const tooFast = game.rounds.filter((r) => r.answer?.correct && r.answer.elapsedMs < MIN_HUMAN_MS).length;
  return tooFast > MAX_TOO_FAST ? "too_fast" : null;
}
