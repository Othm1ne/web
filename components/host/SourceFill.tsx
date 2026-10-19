"use client";

import { useEffect, useState } from "react";
import { GenreSearch } from "@/components/GenreSearch";
import { errorMessage } from "@/lib/client";
import { useI18n } from "@/lib/i18n/client";
import { GENRES, genreSourceId } from "@/lib/music/genres";
import type { ArtistSummary, HostTrack } from "@/lib/types";

const COUNTS = [10, 15, 20];

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Fills an event from one artist or one genre: random songs from the artist's catalog or the
 * genre's current chart. The host can still edit the list afterwards.
 */
export function SourceFill({ kind, onFill }: { kind: "artist" | "genre"; onFill: (tracks: HostTrack[], from: string) => void }) {
  const { d } = useI18n();
  const [count, setCount] = useState(10);
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState<ArtistSummary[] | null>(null);
  const [search, setSearch] = useState<{ q: string; artists: ArtistSummary[] } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (kind !== "artist" || featured) return;
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => setFeatured(d.artists ?? []))
      .catch(() => setFeatured([]));
  }, [kind, featured]);

  useEffect(() => {
    const q = query.trim();
    if (kind !== "artist" || q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/artists?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSearch({ q, artists: d.artists ?? [] }))
        .catch(() => setSearch({ q, artists: [] }));
    }, 300);
    return () => clearTimeout(timer);
  }, [kind, query]);

  async function fill(sourceId: string, name: string) {
    setLoading(sourceId);
    setError("");
    try {
      const res = await fetch(`/api/tracks?source=${encodeURIComponent(sourceId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      onFill(shuffle(data.tracks as HostTrack[]).slice(0, count), name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const q = query.trim();
  const artists = q.length >= 2 ? (search?.q === q ? search.artists : null) : featured;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
        {d.sourceFill.add}
        {COUNTS.map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`rounded-full border px-3 py-1 font-bold transition ${count === n ? "border-lime bg-lime/10 text-lime" : "border-line hover:border-cyan"}`}
          >
            {n}
          </button>
        ))}
        {kind === "artist" ? d.sourceFill.fromArtist : d.sourceFill.fromGenre}
      </div>

      {kind === "artist" ? (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.play.searchArtist}
            className="rounded-xl border border-line bg-panel px-4 py-3 outline-none focus:border-cyan"
          />
          {artists === null ? (
            <p className="text-mute">{d.play.loadingArtists}</p>
          ) : artists.length === 0 ? (
            <p className="text-mute">{d.play.noArtists}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {artists.map((a) => (
                <button
                  key={a.id}
                  onClick={() => fill(a.id, a.name)}
                  disabled={loading !== null}
                  className="flex items-center gap-2 rounded-xl border border-line bg-panel p-2 text-start transition hover:border-cyan disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {a.image ? <img src={a.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-full bg-panel-2" />}
                  <span className="line-clamp-2 text-sm font-medium">{loading === a.id ? d.sourceFill.adding : a.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
        <GenreSearch onPick={(g) => fill(genreSourceId(g.slug), g.name)} disabled={loading !== null} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GENRES.map((g) => (
            <button
              key={g.slug}
              onClick={() => fill(genreSourceId(g.slug), g.name)}
              disabled={loading !== null}
              className={`flex h-16 items-end rounded-xl bg-gradient-to-br p-2.5 text-start font-display font-bold text-white transition hover:scale-[1.02] disabled:opacity-60 ${g.tone}`}
            >
              {loading === genreSourceId(g.slug) ? d.sourceFill.adding : g.name}
            </button>
          ))}
        </div>
        </>
      )}
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
