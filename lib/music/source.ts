// A solo game's song source: one artist's catalog, or a genre's current chart.
import { GameError } from "../game/engine";
import type { ArtistSummary, Track } from "../types";
import { SOURCE_ID, genreFromSource } from "./genres";
import { music } from "./provider";

/** The game's title card (an artist, or the genre dressed as one) and its playable songs. */
export async function loadSource(sourceId: string): Promise<{ artist: ArtistSummary; tracks: Track[] }> {
  if (!SOURCE_ID.test(sourceId)) throw new GameError("artist_not_found", 404);
  const genre = genreFromSource(sourceId);
  if (sourceId.startsWith("genre-") && !genre) throw new GameError("artist_not_found", 404);
  if (!genre) return music.artistTracks(sourceId);
  const tracks = await music.genreTracks(genre);
  return { artist: { id: sourceId, name: genre.name, genre: genre.name, image: "" }, tracks };
}
