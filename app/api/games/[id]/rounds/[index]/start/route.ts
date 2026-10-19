import { startRound } from "@/lib/game/engine";
import { getOwnGame, saveGame } from "@/lib/game/store";
import { roundIndex, route } from "@/lib/http";
import { requireUser } from "@/lib/session";

export const POST = route(async (_req: Request, ctx: RouteContext<"/api/games/[id]/rounds/[index]/start">) => {
  // Read the clock on arrival, like the answer route, so the database round trip isn't counted.
  const now = Date.now();
  const { id, index } = await ctx.params;
  const i = roundIndex(index);
  const userId = (await requireUser()).id;
  const loaded = await getOwnGame(id, userId);
  const alreadyStarted = loaded.game.rounds[i]?.startedAt !== undefined;
  const started = startRound(loaded.game, i, now);
  if (alreadyStarted) return Response.json(started);
  try {
    await saveGame(loaded);
    return Response.json(started);
  } catch {
    // Another request started (or answered) it first: report the clock that was saved.
    return Response.json(startRound((await getOwnGame(id, userId)).game, i));
  }
});
