// Parses Apple's legacy iTunes RSS chart feed (top songs per genre) into playable tracks.
import { normalizeTitle } from "../game/match";
import type { Track } from "../types";

type Label = { label?: string; attributes?: Record<string, string> };
type ChartEntry = {
  "im:name"?: Label;
  "im:artist"?: Label;
  "im:collection"?: { "im:name"?: Label };
  "im:image"?: Label[];
  link?: Label | Label[];
  id?: Label;
};

const bigArtwork = (url = "") => url.replace(/\/\d+x\d+bb\./, "/600x600bb.");

/** Songs with a preview, deduped by title (charts often list a song twice). */
export function parseChartFeed(feed: unknown): Track[] {
  const entries = ((feed as { feed?: { entry?: ChartEntry | ChartEntry[] } })?.feed?.entry ?? []) as ChartEntry | ChartEntry[];
  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const e of Array.isArray(entries) ? entries : [entries]) {
    const links = Array.isArray(e.link) ? e.link : e.link ? [e.link] : [];
    const previewUrl = links.find((l) => l.attributes?.type?.startsWith("audio"))?.attributes?.href;
    const id = e.id?.attributes?.["im:id"];
    const title = e["im:name"]?.label;
    if (!previewUrl || !id || !title) continue;
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const artistId = e["im:artist"]?.attributes?.href?.match(/\/(\d+)(\?|$)/)?.[1];
    const images = e["im:image"] ?? [];
    tracks.push({
      id,
      title,
      artist: e["im:artist"]?.label ?? "",
      album: e["im:collection"]?.["im:name"]?.label ?? "",
      cover: bigArtwork(images[images.length - 1]?.label),
      previewUrl,
      ...(artistId ? { artistId } : {}),
    });
  }
  return tracks;
}
