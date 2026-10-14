export const ROUNDS = 10;
export const OPTIONS_PER_ROUND = 4;
/** Time the player has to answer once the clip starts. */
export const ROUND_MS = 10_000;
/** Network slack accepted after ROUND_MS before an answer counts as a timeout. */
export const GRACE_MS = 1_500;

const MAX_POINTS = 100;
const MIN_POINTS = 55;

/** Correct answers earn 105 - 5/s, clamped to [55, 100]; wrong or late answers earn 0. */
export function pointsFor(correct: boolean, elapsedMs: number): number {
  if (!correct || elapsedMs > ROUND_MS) return 0;
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.round(Math.min(MAX_POINTS, Math.max(MIN_POINTS, 105 - 5 * seconds)));
}
