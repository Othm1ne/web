import type { NextRequest } from "next/server";
import { requireHost } from "@/lib/event/service";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";
import { requireUser } from "@/lib/session";

/** Song search for event hosts. Preview URLs stay on the server. */
export const GET = route(async (req: NextRequest) => {
  requireHost(await requireUser());
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  const tracks = await music.searchTracks(q);
  return Response.json({ tracks: tracks.map(({ id, title, artist, album, cover }) => ({ id, title, artist, album, cover })) });
});
