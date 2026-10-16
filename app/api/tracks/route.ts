import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/event/service";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";
import { loadSource } from "@/lib/music/source";
import { requireUser } from "@/lib/session";

/**
 * Songs for event hosts: a search (?q=), or every playable song of an artist or genre
 * (?source=<artist id | genre-slug>) so the host can fill the event from it. Includes the
 * preview so the host can pick each clip's start; players never see these.
 */
export const GET = route(async (req: NextRequest) => {
  requireHost(await requireUser());
  const params = req.nextUrl.searchParams;
  const source = params.get("source");
  const tracks = source ? (await loadSource(source)).tracks : await music.searchTracks(params.get("q")?.slice(0, 80) ?? "");
  return Response.json({ tracks: tracks.map(({ id, title, artist, album, cover, previewUrl }) => ({ id, title, artist, album, cover, previewUrl })) });
});
