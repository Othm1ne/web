import { startRound } from "@/lib/game/engine";
import { getOwnGame } from "@/lib/game/store";
import { roundIndex, route } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const POST = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]/rounds/[index]/start">) => {
  const { id, index } = await ctx.params;
  return Response.json(startRound(getOwnGame(id, (await requireUser()).id), roundIndex(index)));
});
