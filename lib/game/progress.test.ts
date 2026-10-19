import { describe, expect, it } from "vitest";
import { dayNumber, isTimeZone, levelFor, levelThreshold, localDay, nextStarAt, starsFor, streakFor } from "./progress";

const DAY = 86_400_000;

describe("levels", () => {
  it("grows 500 points more per level", () => {
    expect([1, 2, 3, 4, 5].map(levelThreshold)).toEqual([0, 500, 1500, 3000, 5000]);
    expect(levelFor(0)).toEqual({ level: 1, xp: 0, levelStart: 0, nextLevel: 500 });
    expect(levelFor(499).level).toBe(1);
    expect(levelFor(500).level).toBe(2);
    expect(levelFor(2999)).toMatchObject({ level: 3, levelStart: 1500, nextLevel: 3000 });
  });
});

describe("daily streak", () => {
  const now = 1000 * DAY + 5 * 3_600_000;
  const today = localDay(now);

  it("counts consecutive days ending today", () => {
    expect(streakFor([today, today - 1, today - 2, today - 4], now)).toEqual({ days: 3, playedToday: true });
  });

  it("stays alive until today ends if yesterday was played", () => {
    expect(streakFor([today - 1, today - 2], now)).toEqual({ days: 2, playedToday: false });
  });

  it("resets after a missed day", () => {
    expect(streakFor([today - 2, today - 3], now)).toEqual({ days: 0, playedToday: false });
    expect(streakFor([], now)).toEqual({ days: 0, playedToday: false });
  });

  it("turns the day over at the player's local midnight", () => {
    // 23:30 UTC on 19 Oct is already 20 Oct in Paris (UTC+2 in October) but still 19 Oct in New York.
    const late = Date.parse("2026-10-19T23:30:00Z");
    expect(localDay(late, "Europe/Paris")).toBe(dayNumber("2026-10-20"));
    expect(localDay(late, "America/New_York")).toBe(dayNumber("2026-10-19"));
    expect(localDay(late)).toBe(dayNumber("2026-10-19"));
    // A Parisian who played on the 19th (local) has played "yesterday" at that moment.
    expect(streakFor([dayNumber("2026-10-19")], late, "Europe/Paris")).toEqual({ days: 1, playedToday: false });
    expect(streakFor([dayNumber("2026-10-19")], late, "America/New_York")).toEqual({ days: 1, playedToday: true });
  });

  it("accepts only real time zones", () => {
    expect(isTimeZone("Africa/Casablanca")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
  });
});

describe("stars", () => {
  it("awards up to three, and says what the next one needs", () => {
    expect([0, 399, 400, 699, 700, 899, 900, 1000].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(nextStarAt(350)).toBe(400);
    expect(nextStarAt(750)).toBe(900);
    expect(nextStarAt(950)).toBeNull();
  });
});
