"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CountdownNumber, OptionCard, type OptionState, Standings } from "@/components/EventUI";
import { Equalizer } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import { useEventAudio } from "@/lib/event/useEventAudio";
import { useLiveEvent, useTicker } from "@/lib/event/useLiveEvent";

export function PlayerClient() {
  const { code } = useParams<{ code: string }>();
  const { view, error, serverNow, join, answer } = useLiveEvent(code);
  const sound = useEventAudio(view, serverNow);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<{ round: number; optionId: string } | null>(null);
  useTicker(view?.phase === "countdown" || view?.phase === "question");

  if (!view) return <p className="m-auto text-center text-mute">{error || "Finding the event…"}</p>;

  const hearsMusic = view.mode === "phones";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError("");
    try {
      await action();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (view.role === "host") {
    return (
      <div className="m-auto flex flex-col items-center gap-4 text-center">
        <p className="text-lg">You&apos;re the host of this event.</p>
        <Link href={`/host/${view.code}`} className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink">
          Open the host screen
        </Link>
      </div>
    );
  }

  if (view.role === "visitor") {
    if (view.phase === "finished") return <p className="m-auto text-center text-lg">This event has ended.</p>;
    return (
      <form
        className="m-auto flex w-full max-w-sm flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          // Joining is a tap, so it also unlocks sound on phones that play the music.
          if (hearsMusic) sound.unlock();
          run(() => join(handle.trim() || undefined));
        }}
      >
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-mute">Event {view.code}</p>
          <h1 className="font-display text-3xl font-bold">Hosted by {view.hostHandle}</h1>
          {view.phase !== "lobby" && <p className="mt-1 text-sm text-mute">Already started: you can still jump in.</p>}
        </div>
        <label className="flex flex-col gap-1 text-sm text-mute">
          Your nickname
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            maxLength={24}
            placeholder="Leave empty for a random one"
            className="rounded-xl border border-line bg-panel px-4 py-3 text-base text-white outline-none focus:border-cyan"
          />
        </label>
        <button disabled={busy} className="rounded-2xl bg-lime py-4 font-display text-lg font-bold text-ink disabled:opacity-60">
          {busy ? "Joining…" : "Join"}
        </button>
        {actionError && <p className="text-center text-sm text-coral">{actionError}</p>}
      </form>
    );
  }

  const now = serverNow();
  const you = view.you!;
  const round = view.round;
  const roundLabel = `Round ${view.roundIndex + 1} of ${view.totalRounds}`;
  const chosen = you.answer?.optionId ?? (pending?.round === view.roundIndex ? pending.optionId : null);

  const soundPrompt = hearsMusic && !sound.unlocked && view.phase !== "finished" && (
    <button onClick={sound.unlock} className="rounded-2xl border-2 border-cyan bg-cyan/10 px-4 py-3 font-bold text-cyan">
      🔊 Tap to turn on sound
    </button>
  );

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-bold">{you.handle}</span>
        <span className="text-mute">{view.phase !== "lobby" && view.phase !== "finished" ? roundLabel : `Event ${view.code}`}</span>
        <span className="ml-auto font-display font-bold text-lime">{you.score} pts</span>
        {hearsMusic && sound.unlocked && (
          <button onClick={sound.toggleMute} aria-label={sound.muted ? "Unmute" : "Mute"} className="rounded-lg border border-line px-2 py-1">
            {sound.muted ? "🔇" : "🔊"}
          </button>
        )}
      </div>
      {soundPrompt}

      {view.phase === "lobby" && (
        <div className="m-auto flex flex-col items-center gap-4 text-center">
          <Equalizer />
          <h1 className="font-display text-3xl font-bold">You&apos;re in!</h1>
          <p className="text-mute">
            Waiting for {view.hostHandle} to start. {view.playerCount} {view.playerCount === 1 ? "player" : "players"} so far.
          </p>
          <p className="max-w-xs text-sm text-mute">
            {hearsMusic ? "The music plays on your phone, so turn the volume up." : "Listen to the big screen and answer here."}
          </p>
        </div>
      )}

      {view.phase === "countdown" && view.startsAt !== null && <CountdownNumber ms={view.startsAt - now} label={roundLabel} />}

      {view.phase === "question" && round && view.startsAt !== null && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-panel p-4">
            <div className="flex flex-col gap-1">
              {hearsMusic && <Equalizer />}
              <p className="font-display text-xl font-bold">{chosen ? "Answer locked in" : "What song is this?"}</p>
              <p className="text-sm text-mute">{chosen ? "Waiting for the others…" : "Faster answers score more."}</p>
            </div>
            <TimerRing remaining={view.startsAt + view.roundMs - now} total={view.roundMs} />
          </div>
          <div className="grid flex-1 content-start gap-3">
            {round.options.map((o, i) => {
              const state: OptionState = chosen ? (o.id === chosen ? "picked" : "dim") : "idle";
              return (
                <OptionCard
                  key={o.id}
                  option={o}
                  index={i}
                  state={state}
                  onClick={
                    chosen || busy
                      ? undefined
                      : () => {
                          setPending({ round: view.roundIndex, optionId: o.id });
                          run(() => answer(view.roundIndex, o.id)).then(() => setPending(null));
                        }
                  }
                />
              );
            })}
          </div>
          {actionError && <p className="text-center text-sm text-coral">{actionError}</p>}
        </>
      )}

      {view.phase === "reveal" && round?.reveal && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-panel p-6 text-center">
            <span className={`pop font-display text-5xl font-bold ${you.answer?.correct ? "text-lime" : "text-coral"}`}>
              {you.answer?.correct ? `+${you.answer.points}` : you.answer ? "Wrong" : "No answer"}
            </span>
            <p className="text-mute">
              #{you.rank} of {view.playerCount} · {you.score} pts
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-panel p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={round.reveal.track.cover} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{round.reveal.track.title}</p>
              <p className="truncate text-sm text-mute">{round.reveal.track.artist}</p>
            </div>
          </div>
          <p className="text-center text-sm text-mute">Next song when {view.hostHandle} is ready…</p>
        </div>
      )}

      {view.phase === "finished" && (
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col items-center gap-1 rounded-3xl border border-line bg-panel p-6 text-center">
            <p className="text-sm uppercase tracking-widest text-mute">Final rank</p>
            <p className="font-display text-6xl font-bold text-lime">#{you.rank}</p>
            <p className="text-mute">
              {you.score} pts · {view.playerCount} players
            </p>
          </div>
          <Standings rows={view.standings} />
          <Link href="/play" className="rounded-2xl bg-lime py-4 text-center font-display font-bold text-ink">
            Play solo
          </Link>
        </div>
      )}
    </div>
  );
}
