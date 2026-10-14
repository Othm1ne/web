import { loadState } from "@/lib/event/service";
import { GameError } from "@/lib/game/engine";
import { roundIndex, route } from "@/lib/http";
import { currentUser } from "@/lib/session";

// Streams a round's clip to the device that plays it (the view decides who that is), for the
// current round or the next one (preloading). The preview URL never reaches the browser.
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/events/[code]/rounds/[index]/audio">) => {
  const { code, index } = await ctx.params;
  const i = roundIndex(index);
  const user = await currentUser();
  const { event, view } = await loadState(code, user?.id ?? null);
  const allowed = [view.audio.current, view.audio.next].some((url) => url?.endsWith(`/rounds/${i}/audio`));
  if (!allowed) throw new GameError("not_allowed", 403);
  const track = event.tracks.find((t) => t.id === event.rounds[i].trackId)!;
  const upstream = await fetch(track.previewUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) throw new GameError("audio_unavailable", 502);
  const length = upstream.headers.get("content-length");
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mp4",
      ...(length ? { "Content-Length": length } : {}),
      "Cache-Control": "private, no-store",
    },
  });
});
