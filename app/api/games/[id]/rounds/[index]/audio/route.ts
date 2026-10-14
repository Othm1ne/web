import { GameError } from "@/lib/game/engine";
import { getOwnGame } from "@/lib/game/store";
import { roundIndex, route } from "@/lib/http";
import { requireUser } from "@/lib/session";

// Proxies the clip so the client never sees the preview URL (which identifies the track).
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]/rounds/[index]/audio">) => {
  const { id, index } = await ctx.params;
  const { game } = await getOwnGame(id, (await requireUser()).id);
  const round = game.rounds[roundIndex(index)];
  if (!round) throw new GameError("bad_round");
  const upstream = await fetch(game.tracks.get(round.trackId)!.previewUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) throw new GameError("audio_unavailable", 502);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mp4",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
      "Cache-Control": "private, no-store",
    },
  });
});
