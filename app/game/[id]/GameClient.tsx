"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Equalizer } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import { errorMessage } from "@/lib/client";
import { decryptClip } from "@/lib/game/clip";
import type { PublicGame, RevealResult } from "@/lib/types";

type Phase = "loading" | "ready" | "countdown" | "buffering" | "playing" | "reveal" | "error";
const REVEAL_MS = 4000;
const CLIP_CONCURRENCY = 2;

/** A downloaded clip; sealed ones need the key the round's start hands over. */
type Clip = { data: ArrayBuffer; type: string; sealed: boolean };

/**
 * Downloads clips in round order, a few at a time, so the first rounds are ready quickly and
 * the rest arrive while the player is busy. Returns one promise per clip.
 */
function loadClips(urls: string[], signal: AbortSignal, onLoaded: (index: number) => void): Promise<Clip>[] {
  const slots = urls.map(() => Promise.withResolvers<Clip>());
  slots.forEach((s) => s.promise.catch(() => {}));
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      try {
        const res = await fetch(urls[i], { signal });
        if (!res.ok) throw new Error("clip failed");
        const sealedType = res.headers.get("x-clip-type");
        const clip = { data: await res.arrayBuffer(), type: sealedType ?? res.headers.get("content-type") ?? "audio/mp4", sealed: sealedType !== null };
        onLoaded(i);
        slots[i].resolve(clip);
      } catch (e) {
        slots[i].reject(e);
      }
    }
  };
  for (let k = 0; k < CLIP_CONCURRENCY; k++) worker();
  return slots.map((s) => s.promise);
}

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

export function GameClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [game, setGame] = useState<PublicGame | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(3);
  const [remaining, setRemaining] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealResult | null>(null);
  const [total, setTotal] = useState(0);
  const [muted, setMuted] = useState(false);

  const audio = useRef<HTMLAudioElement | null>(null);
  const clips = useRef<Promise<Clip>[]>([]);
  const objectUrl = useRef<string | null>(null);
  const clipReady = useRef(new Set<number>());
  const timer = useRef<number | null>(null);
  const answering = useRef(false);

  const fail = (e: unknown) => {
    setError((e as Error).message);
    setPhase("error");
  };

  // Load the game, then fetch clips in the background; the first one is enough to start.
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    (async () => {
      const res = await fetch(`/api/games/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      const g = data as PublicGame;
      if (g.finished) return router.replace(`/results/${id}`);
      if (g.rounds.some((r) => r.answered)) throw new Error("This game was already started. Start a new one.");
      setGame(g);
      clips.current = loadClips(
        g.rounds.map((r) => r.audioUrl),
        abort.signal,
        (i) => clipReady.current.add(i),
      );
      await clips.current[0];
      if (!cancelled) setPhase("ready");
    })().catch((e) => !cancelled && fail(e));
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [id, router]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    audio.current?.pause();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
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
      // Normally already downloaded during earlier rounds; on a slow connection, wait for it.
      let clip: Clip;
      if (!clipReady.current.has(i)) setPhase("buffering");
      try {
        clip = await clips.current[i];
      } catch {
        return fail(new Error("A clip failed to load. Check your connection and start a new game."));
      }
      setRemaining(game.roundMs);
      setPhase("playing");
      answering.current = false;
      // Starting the round's clock is what unlocks its clip, so the clip plays right after.
      let data = clip.data;
      try {
        const { clipKey } = await post<{ clipKey: string | null }>(`/api/games/${id}/rounds/${i}/start`);
        if (clip.sealed) data = await decryptClip(clip.data, clipKey ?? "");
      } catch (e) {
        return fail(e);
      }
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(new Blob([data], { type: clip.type }));
      const el = audio.current!;
      el.src = objectUrl.current;
      el.currentTime = 0;
      await el.play().catch(() => {});
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
          <p className="text-mute">Loading the first clip…</p>
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

      {phase === "buffering" && (
        <div className="m-auto flex flex-col items-center gap-4">
          <Equalizer />
          <p className="text-mute">Loading the next clip…</p>
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
