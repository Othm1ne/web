"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Equalizer } from "@/components/Logo";
import { errorMessage } from "@/lib/client";
import type { PublicGame, RevealResult } from "@/lib/types";

type Phase = "loading" | "ready" | "countdown" | "playing" | "reveal" | "error";
const REVEAL_MS = 4000;

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(errorMessage(data.error));
  return data as T;
}

function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const color = frac > 0.5 ? "var(--color-lime)" : frac > 0.25 ? "#facc15" : "var(--color-coral)";
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="var(--color-line)" strokeWidth="5" fill="none" />
        <circle
          cx="32" cy="32" r={r} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold">
        {Math.ceil(remaining / 1000)}
      </span>
    </div>
  );
}

export function GameClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<PublicGame | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(3);
  const [remaining, setRemaining] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [total, setTotal] = useState(0);
  const [muted, setMuted] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const clips = useRef<string[]>([]);
  const timer = useRef<number | null>(null);
  const answering = useRef(false);

  const fail = (e: unknown) => {
    setError((e as Error).message);
    setPhase("error");
  };

  // Load the game and preload every clip so rounds start instantly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      const g = data as PublicGame;
      if (g.finished) return router.replace(`/results/${id}`);
      if (g.rounds.some((r) => r.answered)) throw new Error("This game was already started. Start a new one.");
      setGame(g);
      clips.current = await Promise.all(
        g.rounds.map(async (r) => {
          const blob = await (await fetch(r.audioUrl)).blob();
          if (!cancelled) setLoaded((n) => n + 1);
          return URL.createObjectURL(blob);
        }),
      );
      if (!cancelled) setPhase("ready");
    })().catch((e) => !cancelled && fail(e));
    return () => {
      cancelled = true;
      clips.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id, router]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    audio.current?.pause();
  }, []);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const submit = useCallback(
    async (i: number, optionId: string | null) => {
      if (answering.current) return;
      answering.current = true;
      stopTimer();
      setPicked(optionId);
      try {
        const res = await post<RevealResult>(`/api/games/${id}/rounds/${i}/answer`, { optionId });
        setReveal(res);
        setTotal(res.total);
        setPhase("reveal");
      } catch (e) {
        fail(e);
      }
    },
    [id],
  );

  const startRound = useCallback(
    async (i: number) => {
      if (!game) return;
      setIndex(i);
      setPicked(null);
      setReveal(null);
      setRemaining(game.roundMs);
      setPhase("playing");
      answering.current = false;
      const el = audio.current!;
      el.src = clips.current[i];
      el.currentTime = 0;
      await el.play().catch(() => {});
      try {
        await post(`/api/games/${id}/rounds/${i}/start`);
      } catch (e) {
        return fail(e);
      }
      const startedAt = performance.now();
      timer.current = window.setInterval(() => {
        const left = game.roundMs - (performance.now() - startedAt);
        setRemaining(Math.max(0, left));
        if (left <= 0) submit(i, null);
      }, 100);
    },
    [game, id, submit],
  );

  // Tapping "start" is a user gesture, which lets the browser autoplay the clips.
  function begin() {
    audio.current!.muted = muted;
    audio.current!.play().catch(() => {});
    audio.current!.pause();
    setPhase("countdown");
    let n = 3;
    setCount(n);
    const t = setInterval(() => {
      n -= 1;
      if (n === 0) {
        clearInterval(t);
        startRound(0);
      } else setCount(n);
    }, 800);
  }

  const next = useCallback(() => {
    if (!game || phase !== "reveal") return;
    if (index + 1 >= game.rounds.length) {
      audio.current?.pause();
      router.push(`/results/${id}`);
    } else startRound(index + 1);
  }, [game, phase, index, id, router, startRound]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(next, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, next]);

  function toggleMute() {
    setMuted((m) => {
      if (audio.current) audio.current.muted = !m;
      return !m;
    });
  }

  const round = game?.rounds[index];
  const isLast = game ? index + 1 >= game.rounds.length : false;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <audio ref={audio} preload="auto" />

      {phase === "error" && (
        <div className="m-auto flex flex-col items-center gap-4 text-center">
          <p className="text-lg">{error}</p>
          <button onClick={() => router.push("/play")} className="rounded-2xl bg-lime px-6 py-3 font-bold text-ink">
            Back to artists
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="m-auto flex flex-col items-center gap-4">
          <Equalizer />
          <p className="text-mute">Loading clips… {loaded}/10</p>
        </div>
      )}

      {(phase === "ready" || phase === "countdown") && game && (
        <div className="m-auto flex flex-col items-center gap-6 text-center">
          {game.artist.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.artist.image} alt="" className="h-40 w-40 rounded-3xl object-cover shadow-2xl" />
          )}
          <h1 className="font-display text-3xl font-bold">{game.artist.name}</h1>
          {phase === "ready" ? (
            <button onClick={begin} className="rounded-2xl bg-lime px-10 py-4 font-display text-lg font-bold text-ink">
              I&apos;m ready
            </button>
          ) : (
            <span key={count} className="pop font-display text-7xl font-bold text-lime">{count}</span>
          )}
        </div>
      )}

      {(phase === "playing" || phase === "reveal") && game && round && (
        <>
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-bold">
              {index + 1}<span className="text-mute"> / {game.rounds.length}</span>
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-lime transition-all"
                style={{ width: `${((index + (phase === "reveal" ? 1 : 0)) / game.rounds.length) * 100}%` }}
              />
            </div>
            <span className="font-display text-sm font-bold text-lime">{total} pts</span>
            <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="rounded-lg border border-line px-2 py-1 text-sm">
              {muted ? "🔇" : "🔊"}
            </button>
            <button onClick={() => { audio.current?.pause(); router.push("/play"); }} aria-label="Quit" className="rounded-lg border border-line px-2 py-1 text-sm">
              ✕
            </button>
          </div>

          {phase === "playing" ? (
            <div className="flex items-center justify-between rounded-3xl border border-line bg-panel p-6">
              <div className="flex flex-col gap-2">
                <Equalizer />
                <h1 className="font-display text-2xl font-bold">What song is this?</h1>
                <p className="text-sm text-mute">The quicker you tap, the more you score.</p>
              </div>
              <TimerRing remaining={remaining} total={game.roundMs} />
            </div>
          ) : (
            reveal && (
              <div className="flex gap-4 rounded-3xl border border-line bg-panel p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reveal.track.cover} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover sm:h-36 sm:w-36" />
                <div className="flex min-w-0 flex-col justify-center gap-1">
                  <span className={`pop font-display text-3xl font-bold ${reveal.correct ? "text-lime" : "text-coral"}`}>
                    {reveal.correct ? `+${reveal.points}` : picked ? "Wrong" : "Time's up"}
                  </span>
                  <p className="truncate font-display text-lg font-bold">{reveal.track.title}</p>
                  <p className="truncate text-sm text-mute">{reveal.track.artist} · {reveal.track.album}</p>
                  {reveal.correct && <p className="text-xs text-mute">{(reveal.elapsedMs / 1000).toFixed(1)} s</p>}
                </div>
              </div>
            )
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {round.options.map((o) => {
              const isAnswer = reveal?.correctOptionId === o.id;
              const isWrongPick = reveal && picked === o.id && !isAnswer;
              return (
                <button
                  key={o.id}
                  disabled={phase !== "playing"}
                  onClick={() => submit(index, o.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    isAnswer
                      ? "border-lime bg-lime/10"
                      : isWrongPick
                        ? "border-coral bg-coral/10"
                        : picked === o.id
                          ? "border-cyan bg-panel-2"
                          : "border-line bg-panel enabled:hover:border-cyan disabled:opacity-60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.cover} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <span className="line-clamp-2 font-medium">{o.title}</span>
                </button>
              );
            })}
          </div>

          {phase === "reveal" && (
            <button onClick={next} className="relative mt-auto overflow-hidden rounded-2xl bg-panel-2 py-4 font-display font-bold">
              <span className="fill-bar absolute inset-y-0 left-0 bg-line" style={{ animationDuration: `${REVEAL_MS}ms` }} />
              <span className="relative">{isLast ? "See results" : "Next song"}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
