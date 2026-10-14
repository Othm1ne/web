import { z } from "zod";
import { joinEvent } from "@/lib/db/events";
import { isExpired, loadState } from "@/lib/event/service";
import { GameError } from "@/lib/game/engine";
import { route } from "@/lib/http";
import { notifyEvent } from "@/lib/realtime";
import { currentUser, signInGuest } from "@/lib/session";

const Body = z.object({ handle: z.string().trim().min(2).max(24).optional() });

/** Joins as a player (starting a guest session if needed). Late joiners start from zero. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/events/[code]/join">) => {
  const { code } = await ctx.params;
  const { handle } = Body.parse(await req.json().catch(() => ({})));
  const existing = await currentUser();
  const { db, event } = await loadState(code, existing?.id ?? null);
  if (event.status === "finished" || isExpired(event.createdAt)) throw new GameError("event_over", 410);
  if (existing?.id === event.hostId) throw new GameError("host_cannot_play", 409);
  const user = await signInGuest(handle);
  await joinEvent(db, event.id, user);
  await notifyEvent(event.code);
  return Response.json((await loadState(code, user.id)).view);
});
