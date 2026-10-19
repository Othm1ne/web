"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type User, ensureUser, errorMessage, googleSignInUrl } from "@/lib/client";
import { SourceFill } from "@/components/host/SourceFill";
import { type EventMode, MAX_CLIP_START_S } from "@/lib/event/types";
import { normalizeTitle } from "@/lib/game/match";
import { fmt } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import type { Dict } from "@/lib/i18n/dictionaries/en";
import type { HostTrack } from "@/lib/types";
import { useNavigationBusy } from "@/lib/useNavigationBusy";

const MIN_SONGS = 4;
const MAX_SONGS = 30;
/** Length of a round's answer window, i.e. how much of the clip players hear before time's up. */
const CLIP_S = 10;

type Picked = HostTrack & { startSec: number };

const clock = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

type AddTab = "search" | "artist" | "genre";
const ADD_TABS: { id: AddTab; label: (d: Dict) => string }[] = [
  { id: "search", label: (d) => d.host.addSearch },
  { id: "artist", label: (d) => d.host.addArtist },
  { id: "genre", label: (d) => d.host.addGenre },
];

const MODES: { id: EventMode; title: (d: Dict) => string; body: (d: Dict) => string }[] = [
  { id: "screen", title: (d) => d.host.modeScreen, body: (d) => d.host.modeScreenBody },
  { id: "phones", title: (d) => d.host.modePhones, body: (d) => d.host.modePhonesBody },
];

function Cover({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-panel-2" />;
}

export default function HostPage() {
  const { d } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<EventMode>("screen");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ q: string; tracks: HostTrack[] } | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [addTab, setAddTab] = useState<AddTab>("search");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [creating, setCreating] = useNavigationBusy();
  const [error, setError] = useState("");

  useEffect(() => {
    ensureUser()
      .then((r) => setUser(r.user))
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || user?.provider !== "google") return;
    const timer = setTimeout(() => {
      fetch(`/api/tracks?q=${encodeURIComponent(q)}`)
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(errorMessage(d.error));
          setSearch({ q, tracks: d.tracks });
        })
        .catch((e) => setError((e as Error).message));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user]);

  useEffect(
    () => () => {
      player.current?.pause();
      clearTimeout(stopTimer.current);
    },
    [],
  );

  function stopClip() {
    player.current?.pause();
    clearTimeout(stopTimer.current);
    setPlaying(null);
  }

  /** Plays exactly what players will hear: CLIP_S seconds from the chosen start. */
  function playClip(t: Picked, startSec = t.startSec) {
    const el = (player.current ??= new Audio());
    clearTimeout(stopTimer.current);
    const begin = () => {
      el.currentTime = startSec;
      el.play().catch(() => setPlaying(null));
    };
    if (el.getAttribute("src") !== t.previewUrl) {
      el.src = t.previewUrl;
      el.addEventListener("loadedmetadata", begin, { once: true });
    } else begin();
    setPlaying(t.id);
    stopTimer.current = setTimeout(stopClip, CLIP_S * 1000);
  }

  const setStart = (id: string, startSec: number) =>
    setPicked((list) => list.map((x) => (x.id === id ? { ...x, startSec } : x)));

  /** Appends songs from an artist or genre, skipping ones already picked (or same-titled), up to the limit. */
  function addMany(tracks: HostTrack[], from: string) {
    const ids = new Set(picked.map((t) => t.id));
    const titles = new Set(picked.map((t) => normalizeTitle(t.title)));
    const fresh: Picked[] = [];
    for (const t of tracks) {
      const key = normalizeTitle(t.title);
      if (ids.has(t.id) || titles.has(key) || picked.length + fresh.length >= MAX_SONGS) continue;
      ids.add(t.id);
      titles.add(key);
      fresh.push({ ...t, startSec: 0 });
    }
    setPicked((list) => [...list, ...fresh]);
    setNotice(
      fmt(fresh.length === 0 ? d.host.noneAdded : fresh.length === 1 ? d.host.addedOne : d.host.addedMany, { n: fresh.length, from }),
    );
  }

  const pickedIds = new Set(picked.map((t) => t.id));
  const toggle = (t: HostTrack) => {
    if (playing === t.id) stopClip();
    setPicked((list) =>
      list.some((x) => x.id === t.id)
        ? list.filter((x) => x.id !== t.id)
        : list.length < MAX_SONGS
          ? [...list, { ...t, startSec: 0 }]
          : list,
    );
  };
  const move = (i: number, by: number) =>
    setPicked((list) => {
      const out = [...list];
      const j = i + by;
      if (j < 0 || j >= out.length) return list;
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  const shuffle = () =>
    setPicked((list) => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    });

  async function create() {
    stopClip();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, songs: picked.map((t) => ({ id: t.id, startSec: t.startSec })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      router.push(`/host/${data.code}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  if (!user) return <p className="m-auto text-mute">{error || d.common.loading}</p>;

  if (user.provider !== "google") {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">{d.host.title}</h1>
        <p className="text-mute">{d.host.pitch}</p>
        <a href={googleSignInUrl("/host")} className="btn-press rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink">
          {d.common.signInGoogle}
        </a>
      </div>
    );
  }

  const q = query.trim();
  const results = q.length >= 2 && search?.q === q ? search.tracks : null;

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">{d.host.title}</h1>
        <p className="text-mute">{d.host.intro}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-2xl border-2 p-4 text-start transition ${mode === m.id ? "border-lime bg-lime/10" : "border-line bg-panel hover:border-cyan"}`}
          >
            <p className="font-display text-lg font-bold">{m.title(d)}</p>
            <p className="mt-1 text-sm text-mute">{m.body(d)}</p>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div role="tablist" aria-label={d.host.addSongs} className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1">
          {ADD_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={addTab === t.id}
              onClick={() => {
                setAddTab(t.id);
                setNotice("");
              }}
              className={`rounded-xl px-1 py-2 text-sm font-bold transition ${addTab === t.id ? "bg-lime text-ink" : "text-mute hover:text-white"}`}
            >
              {t.label(d)}
            </button>
          ))}
        </div>
        {notice && <p className="rounded-xl bg-lime/10 px-4 py-2 text-sm text-lime">{notice}</p>}
        {addTab !== "search" ? (
          <SourceFill kind={addTab} onFill={addMany} />
        ) : (
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={d.host.searchSongs}
              className="rounded-xl border border-line bg-panel px-4 py-3 outline-none focus:border-cyan"
            />
            {q.length >= 2 &&
              (results === null ? (
                <p className="text-mute">{d.host.searching}</p>
              ) : results.length === 0 ? (
                <p className="text-mute">{d.host.noSongs}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {results.map((t) => {
                    const added = pickedIds.has(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => toggle(t)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2 pe-3 text-start transition ${added ? "border-lime bg-lime/10" : "border-line bg-panel hover:border-cyan"}`}
                        >
                          <Cover src={t.cover} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{t.title}</p>
                            <p className="truncate text-xs text-mute">{t.artist} · {t.album}</p>
                          </div>
                          <span className={`text-sm font-bold ${added ? "text-lime" : "text-cyan"}`}>{added ? d.host.added : d.host.add}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-mute">
          {d.host.yourSongs} <span className="normal-case tracking-normal">{fmt(d.host.count, { n: picked.length, max: MAX_SONGS, min: MIN_SONGS })}</span>
        </h2>
        {picked.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-mute">
            {d.host.emptyList}
          </p>
        ) : (
          <>
            <ol className="flex flex-col gap-2">
              {picked.map((t, i) => (
                <li key={t.id} className="flex flex-col gap-2 rounded-xl bg-panel p-2 pe-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-display font-bold text-cyan">{i + 1}</span>
                    <Cover src={t.cover} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="truncate text-xs text-mute">{t.artist}</p>
                    </div>
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={d.host.moveUp} className="rounded-lg px-2 py-1 text-mute hover:text-white disabled:opacity-30">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === picked.length - 1} aria-label={d.host.moveDown} className="rounded-lg px-2 py-1 text-mute hover:text-white disabled:opacity-30">↓</button>
                    <button onClick={() => toggle(t)} aria-label={d.host.remove} className="rounded-lg px-2 py-1 text-coral">✕</button>
                  </div>
                  <div className="flex items-center gap-3 ps-1 sm:ps-9">
                    <button
                      onClick={() => (playing === t.id ? stopClip() : playClip(t))}
                      aria-label={fmt(playing === t.id ? d.host.stop : d.host.preview, { title: t.title })}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition ${
                        playing === t.id ? "bg-lime text-ink" : "bg-panel-2 text-cyan hover:text-white"
                      }`}
                    >
                      {playing === t.id ? "■" : "▶"}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={MAX_CLIP_START_S}
                      step={1}
                      value={t.startSec}
                      onChange={(e) => setStart(t.id, Number(e.target.value))}
                      // Replay from the new point once the host lets go, if this song was playing.
                      onPointerUp={(e) => playing === t.id && playClip(t, Number(e.currentTarget.value))}
                      onKeyUp={(e) => playing === t.id && playClip(t, Number(e.currentTarget.value))}
                      aria-label={fmt(d.host.startsAt, { title: t.title })}
                      className="min-w-0 flex-1 accent-lime"
                    />
                    <span className="w-20 shrink-0 text-end text-xs tabular-nums text-mute" dir="ltr">
                      {clock(t.startSec)}–{clock(t.startSec + CLIP_S)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            {picked.length > 1 && (
              <button onClick={shuffle} className="self-start text-sm text-cyan hover:underline">{d.host.shuffle}</button>
            )}
          </>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{fmt(picked.length === 1 ? d.common.song : d.common.songs, { n: picked.length })}</p>
            {error ? <p className="text-sm text-coral">{error}</p> : <p className="text-xs text-mute">{MODES.find((m) => m.id === mode)!.title(d)}</p>}
          </div>
          <button
            onClick={create}
            disabled={picked.length < MIN_SONGS || creating}
            className="btn-press rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink disabled:opacity-50"
          >
            {creating ? d.host.creating : d.host.create}
          </button>
        </div>
      </div>
    </div>
  );
}
