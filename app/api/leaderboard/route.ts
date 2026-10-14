import type { NextRequest } from "next/server";
import { z } from "zod";
import { leaderboard } from "@/lib/game/store";
import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";

const Query = z.object({
  artistId: z.string().regex(/^\d{1,15}$/).optional(),
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
  period: z.enum(["day", "week", "all"]).default("all"),
});

export const GET = route(async (req: NextRequest) => {
  const filter = Query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const user = await currentUser();
  return Response.json({ ...(await leaderboard(filter, user?.id)), userCountry: user?.country ?? null });
});
