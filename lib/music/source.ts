// A game's song source: one artist's catalog, a genre's current chart, or a theme's curated list.
import { GameError } from "../game/engine";
import type { ArtistSummary, Track } from "../types";
import { SOURCE_ID, genreFromSource } from "./genres";
import { music } from "./provider";
import { THEME_SONGS } from "./themeSongs";
import THEME_TRACKS from "./themeTracks.json";
import { themeFromSource } from "./themes";

const resolved = THEME_TRACKS as Record<string, string | null>;

/** The iTunes ids of a theme's songs that the resolve script found. */
export const themeTrackIds = (slug: string): string[] =>
  [...new Set((THEME_SONGS[slug] ?? []).map((song) => resolved[song]).filter((id): id is string => Boolean(id)))];

/** The game's title card (an artist, or the genre or theme dressed as one) and its playable songs. */
export async function loadSource(sourceId: string): Promise<{ artist: ArtistSummary; tracks: Track[] }> {
  if (!SOURCE_ID.test(sourceId)) throw new GameError("artist_not_found", 404);
  const theme = themeFromSource(sourceId);
  if (theme) {
    const tracks = await music.themeTracks(theme.slug, themeTrackIds(theme.slug));
    return { artist: { id: sourceId, name: theme.names.en, genre: theme.names.en, image: "" }, tracks };
  }
  const genre = genreFromSource(sourceId);
  if (/^(genre|theme)-/.test(sourceId) && !genre) throw new GameError("artist_not_found", 404);
  if (!genre) return music.artistTracks(sourceId);
  const tracks = await music.genreTracks(genre);
  return { artist: { id: sourceId, name: genre.name, genre: genre.name, image: "" }, tracks };
}
