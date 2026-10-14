import type { ArtistSummary, Track } from "../types";
import { itunesProvider } from "./itunes";

/** A source of artists and playable preview clips. Swap the implementation to change catalogs. */
export interface MusicProvider {
  searchArtists(query: string): Promise<ArtistSummary[]>;
  featuredArtists(): Promise<ArtistSummary[]>;
  /** Tracks with a playable preview, deduped by normalized title. */
  artistTracks(artistId: string): Promise<{ artist: ArtistSummary; tracks: Track[] }>;
}

export const music: MusicProvider = itunesProvider;
