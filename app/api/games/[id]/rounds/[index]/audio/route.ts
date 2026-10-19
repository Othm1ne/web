import { encryptClip } from "@/lib/game/clip";
import { GameError } from "@/lib/game/engine";
import { getOwnGame } from "@/lib/game/store";
import { roundIndex, route } from "@/lib/http";
import { requireUser } from "@/lib/session";

// Proxies the clip so the client never sees the preview URL (which identifies the track), encrypted
// so it can be preloaded but not heard before the round starts (the start route releases the key).
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]/rounds/[index]/audio">) => {
  const { id, index } = await ctx.params;
  const { game } = await getOwnGame(id, (await requireUser()).id);
  const round = game.rounds[roundIndex(index)];
  if (!round) throw new GameError("bad_round");
  const upstream = await fetch(game.tracks.get(round.trackId)!.previewUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) throw new GameError("audio_unavailable", 502);
  const type = upstream.headers.get("content-type") ?? "audio/mp4";
  // Games created before clips were encrypted have no key: stream those as they are.
  if (!round.clipKey) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
        "Cache-Control": "private, no-store",
      },
    });
  }
  const sealed = await encryptClip(await upstream.arrayBuffer(), round.clipKey);
  return new Response(sealed, {
    headers: { "Content-Type": "application/octet-stream", "X-Clip-Type": type, "Cache-Control": "private, no-store" },
  });
});
