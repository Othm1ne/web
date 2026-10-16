import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/event/service";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";
import { requireUser } from "@/lib/session";

/** Song search for event hosts. Includes the preview so the host can pick each clip's start; players never see these. */
export const GET = route(async (req: NextRequest) => {
  requireHost(await requireUser());
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  const tracks = await music.searchTracks(q);
  return Response.json({ tracks: tracks.map(({ id, title, artist, album, cover, previewUrl }) => ({ id, title, artist, album, cover, previewUrl })) });
});
