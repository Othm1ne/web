"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CountdownNumber, OptionCard, Standings } from "@/components/EventUI";
import { Equalizer, Logo } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import { useEventAudio } from "@/lib/event/useEventAudio";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { useLiveEvent, useTicker } from "@/lib/event/useLiveEvent";

const noopSubscribe = () => () => {};
const useHost = () => useSyncExternalStore(noopSubscribe, () => window.location.host, () => "");

export function HostClient() {
  const { d } = useI18n();
  const { code } = useParams<{ code: string }>();
  const { view, error, serverNow, next } = useLiveEvent(code);
  const sound = useEventAudio(view, serverNow);
  const host = useHost();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  useTicker(view?.phase === "countdown" || view?.phase === "question");

  if (!view) return <p className="m-auto text-mute">{error || d.hostScreen.loading}</p>;

  if (view.role !== "host") {
    return (
      <div className="m-auto flex flex-col items-center gap-4 text-center">
        <p className="text-lg">{fmt(d.hostScreen.notHost, { code: view.code })}</p>
        <Link href={`/e/${view.code}`} className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink">
          {d.hostScreen.joinAsPlayer}
        </Link>
      </div>
    );
  }

  async function onNext() {
    // The host's tap is what lets this screen play music (browsers block sound without one).
    if (view!.mode === "screen" && !sound.unlocked) sound.unlock();
    setBusy(true);
    setActionError("");
    try {
      await next();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const now = serverNow();
  const round = view.round;
  const roundLabel = fmt(d.common.roundOf, { n: view.roundIndex + 1, total: view.totalRounds });
  const isLast = view.roundIndex + 1 >= view.totalRounds;
  const onScreen = view.mode === "screen";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-8 sm:py-6">
        <header className="flex flex-wrap items-center gap-3">
          <Logo />
          <span className="rounded-full bg-panel-2 px-3 py-1 font-display font-bold tracking-widest">{view.code}</span>
          {view.phase !== "lobby" && view.phase !== "finished" && <span className="text-mute">{roundLabel}</span>}
          <span className="ms-auto text-mute">
            {fmt(view.playerCount === 1 ? d.common.player : d.common.players, { n: view.playerCount })}
          </span>
          {onScreen && (
            <button onClick={sound.toggleMute} aria-label={sound.muted ? d.common.unmute : d.common.mute} className="rounded-lg border border-line px-2 py-1 text-sm">
              {sound.muted ? "🔇" : "🔊"}
            </button>
          )}
          <Link href="/" className="rounded-lg border border-line px-2 py-1 text-sm" aria-label={d.hostScreen.leave}>
            ✕
          </Link>
        </header>

        {view.phase === "lobby" && (
          <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
            <section className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-start">
              <p className="text-lg text-mute">
                {fmt(d.hostScreen.joinAt, { url: "\u0000" }).split("\u0000").map((part, i) =>
                  i === 0 ? part : (
                    <span key={i}>
                      <span className="font-bold text-white" dir="ltr">{host}/join</span>
                      {part}
                    </span>
                  ),
                )}
              </p>
              <p className="font-display text-7xl font-bold tracking-[0.2em] text-lime sm:text-8xl" dir="ltr">{view.code}</p>
              <p className="max-w-md text-mute">
                {onScreen ? d.hostScreen.screenInfo : d.hostScreen.phonesInfo}{" "}
                {fmt(d.common.songs, { n: view.totalRounds })}.
              </p>
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-bold">{d.hostScreen.playersHeading}</h2>
              {view.standings.length === 0 ? (
                <p className="flex items-center gap-3 text-mute">
                  <Equalizer /> {d.hostScreen.waiting}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {view.standings.map((p, i) => (
                    <li key={i} className="pop rounded-full bg-panel-2 px-4 py-2 text-lg">
                      {p.handle}
                    </li>
                  ))}
                  {view.playerCount > view.standings.length && (
                    <li className="rounded-full px-4 py-2 text-lg text-mute">{fmt(d.hostScreen.more, { n: view.playerCount - view.standings.length })}</li>
                  )}
                </ul>
              )}
              <button
                onClick={onNext}
                disabled={busy || view.playerCount === 0}
                className="mt-2 rounded-2xl bg-lime px-8 py-4 font-display text-xl font-bold text-ink transition hover:scale-[1.02] disabled:opacity-50"
              >
                {busy ? d.hostScreen.starting : d.hostScreen.start}
              </button>
              {actionError && <p className="text-coral">{actionError}</p>}
            </section>
          </div>
        )}

        {view.phase === "countdown" && view.startsAt !== null && <CountdownNumber ms={view.startsAt - now} label={roundLabel} />}

        {view.phase === "question" && round && view.startsAt !== null && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-line bg-panel p-5 sm:p-6">
              <div className="flex flex-col gap-2">
                <Equalizer />
                <h1 className="font-display text-3xl font-bold sm:text-4xl">{d.common.whatSong}</h1>
                <p className="text-mute">
                  {onScreen ? d.hostScreen.answerOnPhone : d.hostScreen.listenOnPhone}{" "}
                  {fmt(d.hostScreen.answered, { n: round.answered, total: view.playerCount })}
                </p>
              </div>
              <TimerRing remaining={view.startsAt + view.roundMs - now} total={view.roundMs} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {round.options.map((o, i) => (
                <OptionCard key={o.id} option={o} index={i} big />
              ))}
            </div>
          </div>
        )}

        {view.phase === "reveal" && round?.reveal && (
          <div className="grid flex-1 gap-8 lg:grid-cols-[3fr_2fr]">
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-3xl border border-line bg-panel p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={round.reveal.track.cover} alt="" className="pop h-28 w-28 rounded-2xl object-cover sm:h-36 sm:w-36" />
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-widest text-mute">{roundLabel}</p>
                  <p className="font-display text-2xl font-bold sm:text-3xl">{round.reveal.track.title}</p>
                  <p className="text-mute">{round.reveal.track.artist}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {round.options.map((o, i) => (
                  <OptionCard
                    key={o.id}
                    option={o}
                    index={i}
                    state={o.id === round.reveal!.correctOptionId ? "correct" : "dim"}
                    count={round.reveal!.counts[o.id] ?? 0}
                    total={Math.max(1, round.answered)}
                  />
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-4">
              <h2 className="font-display text-2xl font-bold">{d.hostScreen.scores}</h2>
              <Standings rows={view.standings} limit={5} big />
              <button
                onClick={onNext}
                disabled={busy}
                className="mt-auto rounded-2xl bg-lime px-8 py-4 font-display text-xl font-bold text-ink transition hover:scale-[1.02] disabled:opacity-50"
              >
                {busy ? "…" : isLast ? d.hostScreen.finalResults : d.common.nextSong}
              </button>
              {actionError && <p className="text-coral">{actionError}</p>}
            </section>
          </div>
        )}

        {view.phase === "finished" && (
          <div className="flex flex-1 flex-col items-center gap-8">
            <h1 className="font-display text-4xl font-bold sm:text-5xl">{d.hostScreen.finalResults}</h1>
            <div className="flex w-full max-w-2xl items-end justify-center gap-3">
              {[1, 0, 2].map((i) => {
                const p = view.standings[i];
                if (!p) return <div key={i} className="flex-1" />;
                const height = ["h-40", "h-28", "h-20"][i];
                return (
                  <div key={i} className="pop flex flex-1 flex-col items-center gap-2" style={{ animationDelay: `${(2 - i) * 0.25}s` }}>
                    <p className="max-w-full truncate text-lg font-bold">{p.handle}</p>
                    <p className="font-display text-xl text-lime">{p.score}</p>
                    <div className={`flex w-full items-start justify-center rounded-t-2xl bg-panel-2 pt-3 font-display text-3xl font-bold text-cyan ${height}`}>
                      #{p.rank}
                    </div>
                  </div>
                );
              })}
            </div>
            {view.standings.length > 3 && (
              <div className="w-full max-w-2xl">
                <Standings rows={view.standings.slice(3)} />
              </div>
            )}
            <Link href="/host" className="rounded-2xl bg-lime px-8 py-4 font-display text-lg font-bold text-ink">
              {d.hostScreen.hostAnother}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
