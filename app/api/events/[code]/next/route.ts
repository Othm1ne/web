import { saveProgress } from "@/lib/db/events";
import { advance } from "@/lib/event/engine";
import { loadState } from "@/lib/event/service";
import { GameError } from "@/lib/game/engine";
import { route } from "@/lib/http";
import { notifyEvent } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

/** Host only: start the event, go to the next round, or show the final results. */
export const POST = route(async (_req: Request, ctx: RouteContext<"/api/events/[code]/next">) => {
  const { code } = await ctx.params;
  const user = await requireUser();
  const now = Date.now();
  const { db, event, players, phase } = await loadState(code, user.id, now);
  if (event.hostId !== user.id) throw new GameError("not_host", 403);
  if (phase === "lobby" && players.length === 0) throw new GameError("no_players", 409);
  // A double click finds the event already moved on; that's fine, just return the state.
  if (await saveProgress(db, event, advance(event, phase, now))) await notifyEvent(event.code);
  return Response.json((await loadState(code, user.id)).view);
});
