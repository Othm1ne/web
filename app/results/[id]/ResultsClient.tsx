"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createGame, errorMessage } from "@/lib/client";
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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [error, setError] = useState("");
  const [restarting, setRestarting] = useNavigationBusy();
  const score = useCountUp(summary?.score ?? 0);

  useEffect(() => {
    fetch(`/api/games/${id}/summary`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(errorMessage(d.error));
        setSummary(d);
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
  if (!summary) return <p className="m-auto text-mute">Tallying your score…</p>;

  const youInTop = summary.top.some((row) => row.isYou);

  return (
    <div className="flex flex-col gap-6 pb-28">
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-panel p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-mute">{summary.artist.name}</p>
        <p className="font-display text-7xl font-bold text-lime">{score}</p>
        <div className="grid w-full grid-cols-3 gap-2">
          <Stat label="Correct" value={`${summary.correctCount}/${summary.totalRounds}`} />
          <Stat label="Avg time" value={`${(summary.avgMs / 1000).toFixed(1)}s`} />
          <Stat label="Rank" value={`#${summary.rank}`} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">
            Top players <span className="text-sm font-normal text-mute">· {summary.players} total</span>
          </h2>
          <Link href={`/leaderboard?artistId=${summary.artist.id}`} className="text-sm text-cyan hover:underline">
            Full leaderboard
          </Link>
        </div>
        {summary.top.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${row.isYou ? "border border-lime bg-lime/10" : "bg-panel"}`}
          >
            <span className="w-8 font-display font-bold text-cyan">#{row.rank}</span>
            <span className="flex-1 truncate">{row.handle}{row.isYou && " (you)"}</span>
            <span className="font-display font-bold">{row.score}</span>
          </div>
        ))}
        {!youInTop && (
          <div className="flex items-center gap-3 rounded-xl border border-lime bg-lime/10 px-4 py-3">
            <span className="w-8 font-display font-bold text-cyan">#{summary.rank}</span>
            <span className="flex-1 truncate">{summary.handle} (you)</span>
            <span className="font-display font-bold">{summary.score}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold">Round by round</h2>
        {summary.rounds.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-panel p-2 pr-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title}</p>
              <p className="text-xs text-mute">{r.correct ? `${(r.elapsedMs / 1000).toFixed(1)} s` : "missed"}</p>
            </div>
            <span className={`font-display font-bold ${r.correct ? "text-lime" : "text-coral"}`}>
              {r.correct ? `+${r.points}` : "0"}
            </span>
          </div>
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <Link href="/play" className="rounded-2xl border border-line py-3 text-center font-display font-bold">
            New artist
          </Link>
          <button
            onClick={playAgain}
            disabled={restarting}
            className="rounded-2xl bg-lime py-3 font-display font-bold text-ink disabled:opacity-60"
          >
            {restarting ? "Building…" : "Play again"}
          </button>
        </div>
      </div>
    </div>
  );
}
