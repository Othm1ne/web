"use client";

// The player's level and streak, shared by the header chip, the play page and the results
// screen. One copy for the whole tab, refreshed after each game.
import { useEffect, useSyncExternalStore } from "react";
import type { PlayerStats } from "./game/progress";

let stats: PlayerStats | null = null;
let loaded = false;
let inflight: Promise<PlayerStats | null> | null = null;
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Fetches fresh stats; resolves with the stats from before, to spot a level-up. */
export function refreshStats(): Promise<{ before: PlayerStats | null; after: PlayerStats | null }> {
  const before = stats;
  // The streak counts days at the player's own midnight.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  inflight ??= fetch(`/api/stats?tz=${encodeURIComponent(tz)}`)
    .then((r) => r.json())
    .then((d) => (d.stats ?? null) as PlayerStats | null)
    .catch(() => stats)
    .finally(() => {
      inflight = null;
    });
  return inflight.then((after) => {
    stats = after;
    loaded = true;
    listeners.forEach((fn) => fn());
    return { before, after };
  });
}

export function usePlayerStats(): PlayerStats | null {
  const value = useSyncExternalStore(subscribe, () => stats, () => null);
  useEffect(() => {
    if (!loaded) void refreshStats();
  }, []);
  return value;
}
