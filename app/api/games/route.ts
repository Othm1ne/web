import { z } from "zod";
import { createGame } from "@/lib/game/engine";
import { saveGame } from "@/lib/game/store";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";
import { requireUser } from "@/lib/session";

const Body = z.object({ artistId: z.string().regex(/^\d{1,15}$/) });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { artistId } = Body.parse(await req.json());
  const { artist, tracks } = await music.artistTracks(artistId);
  const game = createGame({ id: user.id, handle: user.handle, country: user.country }, artist, tracks);
  saveGame(game);
  return Response.json({ id: game.id }, { status: 201 });
});
