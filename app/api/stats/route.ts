import type { NextRequest } from "next/server";
import { statsFor } from "@/lib/game/store";
import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";

// The player's level, daily streak and best score. ?tz= is the browser's time zone, so the streak
// turns over at the player's midnight. Visitors without a session get null, not an error.
export const GET = route(async (req: NextRequest) => {
  const user = await currentUser();
  const timeZone = req.nextUrl.searchParams.get("tz")?.slice(0, 64) ?? "UTC";
  return Response.json({ stats: user ? await statsFor(user.id, timeZone) : null });
});
