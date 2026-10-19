"use client";

import Link from "next/link";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import type { PlayerStats } from "@/lib/game/progress";
import { usePlayerStats } from "@/lib/usePlayerStats";

/** Level badge: a colored hexagon-ish chip with the level number. */
function LevelBadge({ level, big = false }: { level: number; big?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-pink font-display font-bold text-white shadow-[0_0_20px_-4px_var(--color-pink)] ${
        big ? "h-12 w-12 text-xl" : "h-6 w-6 text-xs"
      }`}
    >
      {level}
    </span>
  );
}

export function LevelBar({ stats }: { stats: PlayerStats }) {
  const share = ((stats.xp - stats.levelStart) / (stats.nextLevel - stats.levelStart)) * 100;
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-panel-2">
      <div className="h-full rounded-full bg-gradient-to-r from-violet via-pink to-amber transition-all duration-1000" style={{ width: `${share}%` }} />
    </div>
  );
}

/** Compact level + streak chip for the header. Hidden until the player has a session. */
export function StatsChip() {
  const { d } = useI18n();
  const stats = usePlayerStats();
  if (!stats) return null;
  return (
    <Link
      href="/play"
      className="flex items-center gap-1.5 rounded-full border border-line bg-panel/80 py-1 ps-1 pe-2.5 text-sm font-bold backdrop-blur transition hover:border-pink"
      aria-label={`${fmt(d.stats.levelLong, { n: stats.level })} · ${fmt(d.stats.streak, { n: stats.days })}`}
    >
      <LevelBadge level={stats.level} />
      <span className={stats.days > 0 ? "text-amber" : "text-mute"}>🔥{stats.days}</span>
    </Link>
  );
}

/** Level progress and the daily-streak nudge, at the top of the play page. */
export function ProgressCard() {
  const { d } = useI18n();
  const stats = usePlayerStats();
  if (!stats) return null;
  const message =
    stats.days === 0 ? d.stats.streakStart : stats.playedToday ? d.stats.streakSafe : fmt(d.stats.streakKeep, { n: stats.days });
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-gradient-to-br from-panel to-panel-2 p-4">
      <div className="flex items-center gap-3">
        <LevelBadge level={stats.level} big />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-bold">{fmt(d.stats.levelLong, { n: stats.level })}</p>
            <p className="text-xs text-mute">{fmt(d.stats.toNext, { n: stats.nextLevel - stats.xp, level: stats.level + 1 })}</p>
          </div>
          <LevelBar stats={stats} />
        </div>
      </div>
      <div className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${stats.playedToday ? "bg-lime/10 text-lime" : "bg-amber/10 text-amber"}`}>
        <span className={`font-display text-2xl font-bold ${stats.days > 0 && !stats.playedToday ? "beat" : ""}`}>🔥{stats.days}</span>
        <span className="flex-1">{message}</span>
      </div>
    </section>
  );
}
