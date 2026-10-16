import { ROUNDS } from "@/lib/game/scoring";
import { route } from "@/lib/http";
import { loadSource } from "@/lib/music/source";

/**
 * A game source's details (an artist, or "genre-<slug>"). The play page calls this on
 * selection so the song list is cached before "Start".
 */
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/artists/[id]">) => {
  const { id } = await ctx.params;
  const { artist, tracks } = await loadSource(id);
  return Response.json({ artist, playable: tracks.length >= ROUNDS });
});
