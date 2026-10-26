"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Confetti } from "@/components/Confetti";
import { LevelBar } from "@/components/PlayerProgress";
import { createGame, errorMessage } from "@/lib/client";
import { type PlayerStats, nextStarAt, starsFor } from "@/lib/game/progress";
import { sfx } from "@/lib/sfx";
import { refreshStats } from "@/lib/usePlayerStats";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { sourceName } from "@/lib/music/themes";
import type { GameSummary } from "@/lib/types";
import { useNavigationBusy } from "@/lib/useNavigationBusy";

function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-panel-2 px-3 py-3">
      <span className="font-display text-xl font-bold">{value}</span>
      <span className="text-xs uppercase tracking-widest text-mute">{label}</span>
    </div>
  );
}

export function ResultsClient() {
  const { d, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useNavigationBusy();
  const [level, setLevel] = useState<{ before: PlayerStats | null; after: PlayerStats | null } | null>(null);
  const score = useCountUp(summary?.score ?? 0);

  useEffect(() => {
    fetch(`/api/games/${id}/summary`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(errorMessage(d.error));
        setSummary(d);
        sfx.fanfare(starsFor((d as GameSummary).score));
        // This game's points are now in the totals: refresh the level and the streak.
        setLevel(await refreshStats());
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function playAgain() {
    if (!summary) return;
    setRestarting(true);
    try {
      router.push(`/game/${await createGame(summary.artist.id)}`);
    } catch (e) {
      setError((e as Error).message);
      setRestarting(false);
    }
  }

  if (error) return <p className="m-auto text-center text-lg">{error}</p>;
  if (!summary) return <p className="m-auto text-mute">{d.results.tallying}</p>;

  const youInTop = summary.top.some((row) => row.isYou);
  const stars = starsFor(summary.score);
  const nextStar = nextStarAt(summary.score);
  const ranked = !summary.unranked;
  const newBest = ranked && summary.previousBest !== null && summary.score > summary.previousBest;
  const levelUp = level?.before && level.after && level.after.level > level.before.level ? level.after.level : null;
  const celebrate = ranked && (newBest || stars === 3 || levelUp !== null);

  return (
    <div className="flex flex-col gap-6 pb-28">
      {celebrate && <Confetti />}
      <section className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-panel-2 to-panel p-6 text-center">
        <div className="absolute -top-24 h-48 w-72 rounded-full bg-gradient-to-r from-violet/40 via-pink/30 to-cyan/30 blur-3xl" aria-hidden />
        <p className="relative text-xs uppercase tracking-widest text-mute">{sourceName(summary.artist, locale)}</p>
        <div className="relative flex gap-2" aria-label={`${stars}/3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`star-in text-5xl ${i < stars ? "drop-shadow-[0_0_14px_var(--color-amber)]" : "opacity-20 grayscale"}`}
              style={{ animationDelay: `${0.3 + i * 0.25}s` }}
            >
              ⭐
            </span>
          ))}
        </div>
        <p className="relative font-display text-7xl font-bold text-gradient">{score}</p>
        {newBest ? (
          <p className="pop relative rounded-full bg-gradient-to-r from-amber to-pink px-4 py-1 font-display font-bold text-ink">🏅 {d.results.newBest}</p>
        ) : ranked && summary.previousBest !== null ? (
          <p className="relative text-sm text-mute">{fmt(d.results.yourBest, { n: summary.previousBest })}</p>
        ) : ranked ? (
          <p className="relative text-sm text-mute">{d.results.firstTry}</p>
        ) : null}
        <p className="relative text-sm font-medium text-amber">
          {nextStar === null ? d.results.allStars : fmt(d.results.nextStar, { n: nextStar - summary.score })}
        </p>
        <div className="grid w-full grid-cols-3 gap-2">
          <Stat label={d.results.correct} value={`${summary.correctCount}/${summary.totalRounds}`} />
          <Stat label={d.results.avgTime} value={fmt(d.common.seconds, { n: (summary.avgMs / 1000).toFixed(1) })} />
          <Stat label={d.results.rank} value={summary.unranked ? "–" : `#${summary.rank}`} />
        </div>
        {summary.unranked && (
          <p className="text-sm text-coral">{d.results.unranked}</p>
        )}
        {level?.after && (
          <div className="relative flex w-full flex-col gap-1.5 text-start">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-display font-bold">
                {levelUp ? <span className="pop inline-block text-pink">⬆ {fmt(d.results.levelUp, { n: levelUp })}</span> : fmt(d.stats.levelLong, { n: level.after.level })}
              </span>
              <span className="text-xs text-mute">{fmt(d.stats.toNext, { n: level.after.nextLevel - level.after.xp, level: level.after.level + 1 })}</span>
            </div>
            <LevelBar stats={level.after} />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">
            {d.results.topPlayers} <span className="text-sm font-normal text-mute">{fmt(d.results.total, { n: summary.players })}</span>
          </h2>
          <Link href={`/leaderboard?artistId=${summary.artist.id}`} className="text-sm text-cyan hover:underline">
            {d.results.fullLeaderboard}
          </Link>
        </div>
        {summary.top.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${row.isYou ? "border border-lime bg-lime/10" : "bg-panel"}`}
          >
            <span className="w-8 font-display font-bold text-cyan">#{row.rank}</span>
            <span className="flex-1 truncate">{row.handle}{row.isYou && d.common.you}</span>
            <span className="font-display font-bold">{row.score}</span>
          </div>
        ))}
        {!youInTop && !summary.unranked && (
          <div className="flex items-center gap-3 rounded-xl border border-lime bg-lime/10 px-4 py-3">
            <span className="w-8 font-display font-bold text-cyan">#{summary.rank}</span>
            <span className="flex-1 truncate">{summary.handle}{d.common.you}</span>
            <span className="font-display font-bold">{summary.score}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold">{d.results.roundByRound}</h2>
        {summary.rounds.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-panel p-2 pe-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title}</p>
              <p className="text-xs text-mute">{r.correct ? fmt(d.common.seconds, { n: (r.elapsedMs / 1000).toFixed(1) }) : d.results.missed}</p>
            </div>
            <span className={`font-display font-bold ${r.correct ? "text-lime" : "text-coral"}`}>
              {r.correct ? `+${r.points}` : "0"}
            </span>
          </div>
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
          <Link href="/play" className="rounded-2xl border border-line py-3 text-center font-display font-bold">
            {d.results.newArtist}
          </Link>
          <button
            onClick={playAgain}
            disabled={restarting}
            className="btn-press rounded-2xl bg-lime py-3 font-display font-bold text-ink disabled:opacity-60"
          >
            {restarting ? d.results.building : d.results.playAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
