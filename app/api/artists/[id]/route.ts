import { GameError } from "@/lib/game/engine";
import { ROUNDS } from "@/lib/game/scoring";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";

/** Artist details. The play page calls this on selection so the track list is cached before "Start". */
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/artists/[id]">) => {
  const { id } = await ctx.params;
  if (!/^\d{1,15}$/.test(id)) throw new GameError("artist_not_found", 404);
  const { artist, tracks } = await music.artistTracks(id);
  return Response.json({ artist, playable: tracks.length >= ROUNDS });
});
