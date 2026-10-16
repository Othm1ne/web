import { z } from "zod";
import { createGame } from "@/lib/game/engine";
import { saveNewGame } from "@/lib/game/store";
import { route } from "@/lib/http";
import { SOURCE_ID } from "@/lib/music/genres";
import { loadSource } from "@/lib/music/source";
import { requireUser } from "@/lib/session";

// artistId is the game's source: an artist's catalog id, or "genre-<slug>".
const Body = z.object({ artistId: z.string().regex(SOURCE_ID) });

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { artistId } = Body.parse(await req.json());
  const { artist, tracks } = await loadSource(artistId);
  const game = createGame({ id: user.id, handle: user.handle, country: user.country }, artist, tracks);
  await saveNewGame(game);
  return Response.json({ id: game.id }, { status: 201 });
});
