import type { ArtistSummary, Track } from "../types";
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
}

export const music: MusicProvider = itunesProvider;
