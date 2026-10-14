// iTunes Search API provider (free 30 s previews). Apple asks for attribution and
// rate-limits to roughly 20 calls/minute, so responses are cached on disk for a day.
import path from "node:path";
import { GameError } from "../game/engine";
import { normalizeTitle } from "../game/match";
import type { ArtistSummary, Track } from "../types";
import { type Cache, createCache } from "./cache";
import type { MusicProvider } from "./provider";

const COUNTRY = process.env.MUSIC_COUNTRY ?? "US";
const FEATURED = (process.env.FEATURED_ARTISTS ??
  "Taylor Swift,Daft Punk,Dua Lipa,The Weeknd,Billie Eilish,Coldplay,Stromae,Bad Bunny"
).split(",");
const DAY = 24 * 60 * 60 * 1000;

type ItunesItem = {
  wrapperType?: string;
  kind?: string;
  artistId?: number;
  artistName?: string;
  trackId?: number;
  trackName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  primaryGenreName?: string;
};

const holder = globalThis as unknown as { __musicCache?: Cache };
const cache = (holder.__musicCache ??= createCache(
  process.env.NODE_ENV === "test" ? null : path.join(process.cwd(), "data", "music-cache.json"),
));
const cached = cache.get;

async function call(endpoint: "search" | "lookup", params: Record<string, string>): Promise<ItunesItem[]> {
  const url = new URL(endpoint, "https://itunes.apple.com/");
  for (const [k, v] of Object.entries({ ...params, country: COUNTRY })) url.searchParams.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 403 || res.status === 429) throw new GameError("music_rate_limited", 503);
  if (!res.ok) throw new GameError("music_unavailable", 502);
  return ((await res.json()) as { results?: ItunesItem[] }).results ?? [];
}

const artwork = (url?: string, size = 600) => (url ? url.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`) : "");

/** Song search grouped by artist: one call returns artists with an image each. */
function artistsFromSongs(items: ItunesItem[]): ArtistSummary[] {
  const byId = new Map<string, ArtistSummary>();
  for (const it of items) {
    if (!it.artistId || !it.artistName || byId.has(String(it.artistId))) continue;
    byId.set(String(it.artistId), {
      id: String(it.artistId),
      name: it.artistName,
      genre: it.primaryGenreName ?? "",
      image: artwork(it.artworkUrl100, 300),
    });
  }
  return [...byId.values()];
}

function toTrack(it: ItunesItem): Track | null {
  if (it.wrapperType !== "track" || it.kind !== "song" || !it.previewUrl || !it.trackName || !it.trackId) return null;
  return {
    id: String(it.trackId),
    title: it.trackName,
    artist: it.artistName ?? "",
    album: it.collectionName ?? "",
    cover: artwork(it.artworkUrl100),
    previewUrl: it.previewUrl,
    ...(it.artistId ? { artistId: String(it.artistId) } : {}),
  };
}

async function searchArtists(query: string): Promise<ArtistSummary[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return cached(`search:${q}`, DAY, async () => {
    const items = await call("search", { term: q, entity: "song", attribute: "artistTerm", limit: "50" });
    return artistsFromSongs(items).slice(0, 8);
  });
}

export const itunesProvider: MusicProvider = {
  searchArtists,

  featuredArtists: () =>
    cached("featured", DAY, async () => {
      const found = await Promise.all(FEATURED.map((name) => searchArtists(name).catch(() => [])));
      return found.map((list) => list[0]).filter((a): a is ArtistSummary => Boolean(a));
    }),

  artistTracks: (artistId) =>
    cached(`tracks:${artistId}`, DAY, async () => {
      const items = await call("lookup", { id: artistId, entity: "song", limit: "200" });
      const artistItem = items.find((i) => i.wrapperType === "artist");
      if (!artistItem) throw new GameError("artist_not_found", 404);
      const seen = new Set<string>();
      const tracks: Track[] = [];
      for (const it of items) {
        const track = toTrack(it);
        if (!track || String(it.artistId) !== artistId) continue;
        const key = normalizeTitle(track.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        tracks.push({ ...track, artist: track.artist || artistItem.artistName || "" });
      }
      const artist: ArtistSummary = {
        id: artistId,
        name: artistItem.artistName ?? "",
        genre: artistItem.primaryGenreName ?? "",
        image: tracks[0]?.cover ?? "",
      };
      return { artist, tracks };
    }),

  searchTracks: async (query) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return cached(`songs:${q}`, DAY, async () => {
      const items = await call("search", { term: q, entity: "song", limit: "40" });
      // The same song often appears on several albums; keep the first of each title + artist.
      const seen = new Set<string>();
      return items
        .map(toTrack)
        .filter((t): t is Track => t !== null)
        .filter((t) => {
          const key = `${normalizeTitle(t.title)}|${t.artist.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 20);
    });
  },

  // Not cached: called once per event, and the preview URLs must be current.
  tracksByIds: async (ids) => {
    if (ids.length === 0) return [];
    const items = await call("lookup", { id: ids.join(",") });
    const byId = new Map(items.map(toTrack).filter((t): t is Track => t !== null).map((t) => [t.id, t]));
    return ids.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
  },
};
