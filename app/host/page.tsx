"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type User, ensureUser, errorMessage, googleSignInUrl } from "@/lib/client";
import type { EventMode } from "@/lib/event/types";
import type { TrackSummary } from "@/lib/types";

const MIN_SONGS = 4;
const MAX_SONGS = 30;

const MODES: { id: EventMode; title: string; body: string }[] = [
  { id: "screen", title: "Big screen + phones", body: "Your screen plays the music and shows the choices. Players answer on their phones." },
  { id: "phones", title: "Everyone on their phone", body: "Each phone plays the music and shows the choices. No big screen needed." },
];

function Cover({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-12 shrink-0 rounded-lg bg-panel-2" />;
}

export default function HostPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<EventMode>("screen");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ q: string; tracks: TrackSummary[] } | null>(null);
  const [picked, setPicked] = useState<TrackSummary[]>([]);
  const [creating, setCreating] = useState(false);
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

  const pickedIds = new Set(picked.map((t) => t.id));
  const toggle = (t: TrackSummary) =>
    setPicked((list) =>
      list.some((x) => x.id === t.id) ? list.filter((x) => x.id !== t.id) : list.length < MAX_SONGS ? [...list, t] : list,
    );
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
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, trackIds: picked.map((t) => t.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      router.push(`/host/${data.code}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  }

  if (!user) return <p className="m-auto text-mute">{error || "Loading…"}</p>;

  if (user.provider !== "google") {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">Host a live event</h1>
        <p className="text-mute">Pick the songs, share a code, and play together like a quiz night. Hosting needs a Google account; players join with just a nickname.</p>
        <a href={googleSignInUrl("/host")} className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink">
          Sign in with Google
        </a>
      </div>
    );
  }

  const q = query.trim();
  const results = q.length >= 2 && search?.q === q ? search.tracks : null;

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Host a live event</h1>
        <p className="text-mute">Choose how to play, pick your songs, then share the code.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-2xl border-2 p-4 text-left transition ${mode === m.id ? "border-lime bg-lime/10" : "border-line bg-panel hover:border-cyan"}`}
          >
            <p className="font-display text-lg font-bold">{m.title}</p>
            <p className="mt-1 text-sm text-mute">{m.body}</p>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-mute">
          Your songs <span className="normal-case tracking-normal">({picked.length}/{MAX_SONGS}, at least {MIN_SONGS})</span>
        </h2>
        {picked.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-mute">
            Search below and add songs. Each song is one round, and the wrong choices come from your other songs.
          </p>
        ) : (
          <>
            <ol className="flex flex-col gap-2">
              {picked.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-panel p-2 pr-3">
                  <span className="w-6 text-center font-display font-bold text-cyan">{i + 1}</span>
                  <Cover src={t.cover} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-mute">{t.artist}</p>
                  </div>
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg px-2 py-1 text-mute hover:text-white disabled:opacity-30">↑</button>
                  <button onClick={() => move(i, 1)} disabled={i === picked.length - 1} aria-label="Move down" className="rounded-lg px-2 py-1 text-mute hover:text-white disabled:opacity-30">↓</button>
                  <button onClick={() => toggle(t)} aria-label="Remove" className="rounded-lg px-2 py-1 text-coral">✕</button>
                </li>
              ))}
            </ol>
            {picked.length > 1 && (
              <button onClick={shuffle} className="self-start text-sm text-cyan hover:underline">Shuffle order</button>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs or artists…"
          className="rounded-xl border border-line bg-panel px-4 py-3 outline-none focus:border-cyan"
        />
        {q.length >= 2 &&
          (results === null ? (
            <p className="text-mute">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-mute">No songs found.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((t) => {
                const added = pickedIds.has(t.id);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => toggle(t)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 pr-3 text-left transition ${added ? "border-lime bg-lime/10" : "border-line bg-panel hover:border-cyan"}`}
                    >
                      <Cover src={t.cover} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.title}</p>
                        <p className="truncate text-xs text-mute">{t.artist} · {t.album}</p>
                      </div>
                      <span className={`text-sm font-bold ${added ? "text-lime" : "text-cyan"}`}>{added ? "Added" : "+ Add"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{picked.length} {picked.length === 1 ? "song" : "songs"}</p>
            {error ? <p className="text-sm text-coral">{error}</p> : <p className="text-xs text-mute">{MODES.find((m) => m.id === mode)!.title}</p>}
          </div>
          <button
            onClick={create}
            disabled={picked.length < MIN_SONGS || creating}
            className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink transition hover:scale-[1.03] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create event"}
          </button>
        </div>
      </div>
    </div>
  );
}
