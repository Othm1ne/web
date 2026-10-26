"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OPTION_TONES } from "@/components/EventUI";
import { Equalizer } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import { errorMessage } from "@/lib/client";
import { setSfxMuted, sfx, unlockSfx } from "@/lib/sfx";
import { decryptClip } from "@/lib/game/clip";
import { activeDict } from "@/lib/i18n/active";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { sourceName } from "@/lib/music/themes";
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
  const { d, locale } = useI18n();
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
  // Right answers in a row: purely for show (and sound), scoring ignores it.
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const lastTick = useRef(0);

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
      if (g.rounds.some((r) => r.answered)) throw new Error(activeDict().game.alreadyStarted);
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
        comboRef.current = res.correct ? comboRef.current + 1 : 0;
        setCombo(comboRef.current);
        if (res.correct) sfx.correct(comboRef.current);
        else sfx.wrong();
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
        return fail(new Error(activeDict().game.clipFailed));
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
      lastTick.current = 0;
      timer.current = window.setInterval(() => {
        const left = game.roundMs - (performance.now() - startedAt);
        setRemaining(Math.max(0, left));
        // Tick through the last three seconds.
        const second = Math.ceil(left / 1000);
        if (second <= 3 && second > 0 && second !== lastTick.current) {
          lastTick.current = second;
          sfx.tick();
        }
        if (left <= 0) submit(i, null);
      }, 100);
    },
    [game, id, submit],
  );

  // Tapping "start" is a user gesture, which lets the browser autoplay the clips.
  function begin() {
    unlockSfx();
    sfx.count();
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
        sfx.count(true);
        startRound(0);
      } else {
        sfx.count();
        setCount(n);
      }
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
      setSfxMuted(!m);
      return !m;
    });
  }

  const round = game?.rounds[index];
  const isLast = game ? index + 1 >= game.rounds.length : false;
  const urgent = phase === "playing" && remaining > 0 && remaining <= 3000;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <audio ref={audio} preload="auto" />

      {phase === "error" && (
        <div className="m-auto flex flex-col items-center gap-4 text-center">
          <p className="text-lg">{error}</p>
          <button onClick={() => router.push("/play")} className="btn-press rounded-2xl bg-lime px-6 py-3 font-bold text-ink">
            {d.game.back}
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="m-auto flex flex-col items-center gap-4">
          <Equalizer />
          <p className="text-mute">{d.game.loadingFirst}</p>
        </div>
      )}

      {(phase === "ready" || phase === "countdown") && game && (
        <div className="m-auto flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-violet/40 via-pink/30 to-cyan/30 blur-2xl" aria-hidden />
            {game.artist.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={game.artist.image} alt="" className="relative h-44 w-44 rounded-3xl object-cover shadow-2xl ring-4 ring-white/10" />
            ) : (
              <span className="relative flex h-44 w-44 items-center justify-center rounded-3xl bg-gradient-to-br from-violet to-pink text-7xl shadow-2xl" aria-hidden>
                🎧
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl font-bold">{sourceName(game.artist, locale)}</h1>
          {phase === "ready" ? (
            <button onClick={begin} className="btn-press rounded-2xl bg-lime px-12 py-4 font-display text-xl font-bold text-ink">
              {d.game.ready}
            </button>
          ) : (
            <span key={count} className="pop font-display text-8xl font-bold text-gradient">{count}</span>
          )}
        </div>
      )}

      {phase === "buffering" && (
        <div className="m-auto flex flex-col items-center gap-4">
          <Equalizer />
          <p className="text-mute">{d.game.loadingNext}</p>
        </div>
      )}

      {(phase === "playing" || phase === "reveal") && game && round && (
        <>
          {phase === "reveal" && reveal && (
            <div key={`flash-${index}`} className={`flash ${reveal.correct ? "bg-lime" : "bg-coral"}`} aria-hidden />
          )}
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold">
              {index + 1}<span className="text-mute">/{game.rounds.length}</span>
            </span>
            <div className="flex flex-1 gap-1">
              {game.rounds.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i < index || (i === index && phase === "reveal") ? "bg-gradient-to-r from-cyan to-lime" : i === index ? "bg-white/40" : "bg-panel-2"
                  }`}
                />
              ))}
            </div>
            <span className="rounded-full bg-lime/10 px-2.5 py-1 font-display text-sm font-bold text-lime">{fmt(d.common.pts, { n: total })}</span>
            <button onClick={toggleMute} aria-label={muted ? d.common.unmute : d.common.mute} className="rounded-lg border border-line px-2 py-1 text-sm">
              {muted ? "🔇" : "🔊"}
            </button>
            <button onClick={() => { audio.current?.pause(); router.push("/play"); }} aria-label={d.game.quit} className="rounded-lg border border-line px-2 py-1 text-sm">
              ✕
            </button>
          </div>

          {combo >= 2 && (
            <p key={`combo-${combo}`} className="pop self-center rounded-full bg-gradient-to-r from-amber to-pink px-4 py-1 font-display font-bold text-ink shadow-[0_0_24px_-6px_var(--color-pink)]">
              🔥 {fmt(d.game.combo, { n: combo })}
            </p>
          )}

          {phase === "playing" ? (
            <div className="flex items-center justify-between rounded-3xl border border-line bg-gradient-to-br from-panel to-panel-2 p-5">
              <div className="flex flex-col gap-2">
                <Equalizer />
                <h1 className="font-display text-2xl font-bold">{d.common.whatSong}</h1>
                <p className="text-sm text-mute">{d.game.hint}</p>
              </div>
              <div className={urgent ? "urgent" : ""}>
                <TimerRing remaining={remaining} total={game.roundMs} />
              </div>
            </div>
          ) : (
            reveal && (
              <div
                key={`reveal-${index}`}
                className={`relative flex gap-4 rounded-3xl border-2 p-4 ${reveal.correct ? "border-lime bg-lime/10" : "shake border-coral bg-coral/10"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reveal.track.cover} alt="" className="pop h-28 w-28 shrink-0 rounded-2xl object-cover shadow-xl sm:h-36 sm:w-36" />
                <div className="flex min-w-0 flex-col justify-center gap-1">
                  <span className={`pop font-display text-4xl font-bold ${reveal.correct ? "text-lime" : "text-coral"}`}>
                    {reveal.correct ? `+${reveal.points}` : picked ? d.common.wrong : d.game.timesUp}
                  </span>
                  <p className="truncate font-display text-lg font-bold">{reveal.track.title}</p>
                  <p className="truncate text-sm text-mute">{reveal.track.artist} · {reveal.track.album}</p>
                  {reveal.correct && <p className="text-xs text-mute">{fmt(d.common.seconds, { n: (reveal.elapsedMs / 1000).toFixed(1) })}</p>}
                </div>
                {reveal.correct && (
                  <span className="rise absolute end-4 top-2 font-display text-2xl font-bold text-lime" aria-hidden>
                    +{reveal.points}
                  </span>
                )}
              </div>
            )
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {round.options.map((o, i) => {
              const tone = OPTION_TONES[i % OPTION_TONES.length];
              const isAnswer = reveal?.correctOptionId === o.id;
              const isWrongPick = reveal && picked === o.id && !isAnswer;
              return (
                <button
                  key={o.id}
                  disabled={phase !== "playing"}
                  onClick={() => submit(index, o.id)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 text-start transition active:scale-[0.97] ${
                    isAnswer
                      ? "border-lime bg-lime/15 shadow-[0_0_30px_-10px_var(--color-lime)]"
                      : isWrongPick
                        ? "border-coral bg-coral/10"
                        : picked === o.id
                          ? `${tone.ring} ${tone.fill}`
                          : `border-line bg-panel ${tone.hover} disabled:opacity-50`
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-ink ${
                      isAnswer ? "bg-lime" : isWrongPick ? "bg-coral" : tone.chip
                    }`}
                  >
                    {isAnswer ? "✓" : isWrongPick ? "✕" : tone.letter}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.cover} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  <span className="line-clamp-2 font-medium">{o.title}</span>
                </button>
              );
            })}
          </div>

          {phase === "reveal" && (
            <button onClick={next} className="btn-press relative mt-auto overflow-hidden rounded-2xl bg-cyan py-4 font-display text-lg font-bold text-ink [--press:#1a8f9c]">
              <span className="fill-bar absolute inset-y-0 start-0 bg-white/30" style={{ animationDuration: `${REVEAL_MS}ms` }} />
              <span className="relative">{isLast ? d.game.seeResults : d.common.nextSong}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
