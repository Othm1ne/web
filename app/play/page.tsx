"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type User, createGame, ensureUser, errorMessage, googleSignInUrl, renameUser, signOut } from "@/lib/client";
import type { ArtistSummary } from "@/lib/types";

function ArtistCard({ artist, selected, onSelect }: { artist: ArtistSummary; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
        selected ? "border-lime bg-panel-2" : "border-line bg-panel hover:border-cyan"
      }`}
    >
      {artist.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artist.image} alt="" className="aspect-square w-full rounded-xl object-cover" />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-panel-2 font-display text-3xl font-bold text-cyan">
          {artist.name.slice(0, 1)}
        </span>
      )}
      <span className="line-clamp-1 text-sm font-medium">{artist.name}</span>
    </button>
  );
}

export default function PlayPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [google, setGoogle] = useState(false);
  const [edited, setHandle] = useState<string | null>(null);
  const handle = edited ?? user?.handle ?? "";
  const [featured, setFeatured] = useState<ArtistSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ q: string; artists: ArtistSummary[] } | null>(null);
  const [selected, setSelected] = useState<ArtistSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUser = (signinFailed = false) =>
    ensureUser()
      .then((r) => {
        setUser(r.user);
        setGoogle(r.google);
        if (signinFailed) setNotice("Google sign-in didn't work. You can keep playing as a guest.");
      })
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    // The Google callback lands here with ?signin=ok|failed|cancelled.
    const signin = new URLSearchParams(window.location.search).get("signin");
    if (signin) window.history.replaceState(null, "", window.location.pathname);
    loadUser(signin === "failed");
  }, []);

  async function logout() {
    await signOut().catch(() => {});
    setHandle(null);
    setUser(null);
    loadUser();
  }

  useEffect(() => {
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => setFeatured(d.artists ?? []))
      .catch(() => setFeatured([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/artists?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSearch({ q, artists: d.artists ?? [] }))
        .catch(() => setSearch({ q, artists: [] }));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Warm the server's track cache as soon as an artist is picked, so "Start" is instant.
  function select(artist: ArtistSummary) {
    setSelected(artist);
    setError("");
    fetch(`/api/artists/${artist.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.playable === false) setError(errorMessage("not_enough_tracks"));
      })
      .catch(() => {});
  }

  async function start() {
    if (!selected || !user || starting) return;
    setStarting(true);
    setError("");
    try {
      const name = handle.trim();
      if (name && name !== user.handle) setUser(await renameUser(name));
      router.push(`/game/${await createGame(selected.id)}`);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  const q = query.trim();
  const results = q.length >= 2 ? (search?.q === q ? search.artists : null) : null;
  const list = q.length >= 2 ? results : featured;

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Choose an artist</h1>
        <p className="text-mute">10 clips, 10 seconds each. Ready?</p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-mute">
        Your nickname
        <input
          value={handle}
          maxLength={24}
          placeholder={user ? "" : "Loading…"}
          onChange={(e) => setHandle(e.target.value)}
          className="rounded-xl border border-line bg-panel px-4 py-3 text-base text-white outline-none focus:border-cyan"
        />
      </label>

      {user && (user.provider === "google" ? (
        <p className="-mt-3 text-sm text-mute">
          Signed in with Google.{" "}
          <button onClick={logout} className="text-cyan hover:underline">Sign out</button>
        </p>
      ) : google ? (
        <a
          href={googleSignInUrl("/play")}
          className="-mt-2 flex items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm font-medium transition hover:border-cyan"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Sign in with Google to keep your scores on every device
        </a>
      ) : null)}
      {notice && <p className="-mt-3 text-sm text-coral">{notice}</p>}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search an artist…"
        className="rounded-xl border border-line bg-panel px-4 py-3 outline-none focus:border-cyan"
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-mute">
          {q.length >= 2 ? "Search results" : "Popular picks"}
        </h2>
        {list === null ? (
          <p className="text-mute">Loading artists…</p>
        ) : list.length === 0 ? (
          <p className="text-mute">No artists found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {list.map((a) => (
              <ArtistCard key={a.id} artist={a} selected={selected?.id === a.id} onSelect={() => select(a)} />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/90 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-mute">Artist</p>
              <p className="truncate font-display text-lg font-bold">{selected.name}</p>
              {error && <p className="text-sm text-coral">{error}</p>}
            </div>
            <button
              onClick={start}
              disabled={starting || !user}
              className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink transition hover:scale-[1.03] disabled:opacity-60"
            >
              {starting ? "Building game…" : "Start game"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
