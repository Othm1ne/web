import { loadState } from "@/lib/event/service";
import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";

/** The event as the current viewer may see it (host, player or visitor). */
export const GET = route(async (_req: Request, ctx: RouteContext<"/api/events/[code]">) => {
  const { code } = await ctx.params;
  const user = await currentUser();
  return Response.json((await loadState(code, user?.id ?? null)).view);
});
