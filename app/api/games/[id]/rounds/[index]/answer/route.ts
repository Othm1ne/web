import { z } from "zod";
import { answerRound } from "@/lib/game/engine";
import { getOwnGame, recordResult } from "@/lib/game/store";
import { roundIndex, route } from "@/lib/http";
import { requireUser } from "@/lib/session";

const Body = z.object({ optionId: z.string().max(32).nullable() });

export const POST = route(async (req: Request, ctx: RouteContext<"/api/games/[id]/rounds/[index]/answer">) => {
  const now = Date.now();
  const { id, index } = await ctx.params;
  const { optionId } = Body.parse(await req.json());
  const game = getOwnGame(id, (await requireUser()).id);
  const result = answerRound(game, roundIndex(index), optionId, now);
  // A failed save must not cost the player their final reveal; the summary still works from memory.
  if (result.finished) await recordResult(game).catch((err) => console.error("recordResult failed", err));
  return Response.json(result);
});
