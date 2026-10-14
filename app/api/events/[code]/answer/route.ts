import { z } from "zod";
import { saveAnswer } from "@/lib/db/events";
import { gradeAnswer } from "@/lib/event/engine";
import { loadState } from "@/lib/event/service";
import { GameError } from "@/lib/game/engine";
import { route } from "@/lib/http";
import { notifyEvent } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

const Body = z.object({ round: z.number().int().min(0), optionId: z.string().max(32) });

/** A player's answer, graded with the server clock. One answer per round. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/events/[code]/answer">) => {
  const now = Date.now();
  const { code } = await ctx.params;
  const { round, optionId } = Body.parse(await req.json());
  const user = await requireUser();
  const { db, event, view } = await loadState(code, user.id, now);
  if (view.role !== "player") throw new GameError("not_a_player", 403);
  await saveAnswer(db, event.id, round, gradeAnswer(event, round, optionId, user.id, now));
  await notifyEvent(event.code);
  return Response.json((await loadState(code, user.id)).view);
});
