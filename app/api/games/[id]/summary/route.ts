import { getGame, summaryFor } from "@/lib/game/store";
import { route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]/summary">) => {
  const { id } = await ctx.params;
  return Response.json(await summaryFor(getGame(id)));
});
