// Progression that keeps players coming back: levels from lifetime points, a daily streak and
// stars per game. Pure, and derived from finished games, so nothing extra is stored.
// Purely cosmetic: scoring itself (scoring.ts) never changes.

export type Level = { level: number; xp: number; levelStart: number; nextLevel: number };
export type Streak = { days: number; playedToday: boolean };
export type PlayerStats = Level & Streak & { best: number };

/** Points needed to reach a level: 0, 500, 1500, 3000, 5000… (each level costs 500 more). */
export const levelThreshold = (level: number) => 250 * level * (level - 1);

export function levelFor(xp: number): Level {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  return { level, xp, levelStart: levelThreshold(level), nextLevel: levelThreshold(level + 1) };
}

const DAY_MS = 86_400_000;

/** Whether the browser sent a real IANA time zone ("Africa/Casablanca"). */
export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Day number of a calendar date ("2026-10-19"), counted the same way in every time zone. */
export const dayNumber = (isoDate: string) => Math.round(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);

/** Day number of the local calendar date at `ms` in a time zone, so days turn over at local midnight. */
export function localDay(ms: number, timeZone = "UTC"): number {
  // en-CA formats dates as YYYY-MM-DD.
  return dayNumber(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms));
}

/**
 * Consecutive days played, ending today, or yesterday (the streak is still alive until today
 * ends). `days` are day numbers of the player's local dates with a finished game, in any order.
 */
export function streakFor(days: number[], now = Date.now(), timeZone = "UTC"): Streak {
  const played = new Set(days);
  const today = localDay(now, timeZone);
  const playedToday = played.has(today);
  let day = playedToday ? today : today - 1;
  let count = 0;
  while (played.has(day)) {
    count++;
    day--;
  }
  return { days: count, playedToday };
}

/** Score needed for each star: one for a decent game, three for a near-perfect one. */
export const STAR_SCORES = [400, 700, 900] as const;

export const starsFor = (score: number) => STAR_SCORES.filter((s) => score >= s).length;

/** Points needed for the next star, or null with all three. */
export function nextStarAt(score: number): number | null {
  return STAR_SCORES.find((s) => score < s) ?? null;
}
