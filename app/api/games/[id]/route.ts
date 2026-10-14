import { toPublicGame } from "@/lib/game/engine";
import { getOwnGame } from "@/lib/game/store";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const GET = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]">) => {
  const { id } = await ctx.params;
  return Response.json(toPublicGame((await getOwnGame(id, (await requireUser()).id)).game));
});
