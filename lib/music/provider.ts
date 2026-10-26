import type { ArtistSummary, Track } from "../types";
import type { Genre } from "./genres";
import { itunesProvider } from "./itunes";

/** A source of artists and playable preview clips. Swap the implementation to change catalogs. */
export interface MusicProvider {
  searchArtists(query: string): Promise<ArtistSummary[]>;
  featuredArtists(): Promise<ArtistSummary[]>;
  /** Tracks with a playable preview, deduped by normalized title. */
  artistTracks(artistId: string): Promise<{ artist: ArtistSummary; tracks: Track[] }>;
  /** Songs by title or artist, with a playable preview. */
  searchTracks(query: string): Promise<Track[]>;
  /** Looks songs up by id (missing or preview-less ids are dropped), in the given order. */
  tracksByIds(ids: string[]): Promise<Track[]>;
  /** Current popular songs in a genre, with a playable preview. */
  genreTracks(genre: Genre): Promise<Track[]>;
  /** A theme's hand-picked songs by id, deduped by title. Cached, unlike tracksByIds. */
  themeTracks(slug: string, ids: string[]): Promise<Track[]>;
}

export const music: MusicProvider = itunesProvider;
