import type { NextRequest } from "next/server";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";

export const GET = route(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 60) ?? "";
  const artists = q ? await music.searchArtists(q) : await music.featuredArtists();
  return Response.json({ artists });
});
