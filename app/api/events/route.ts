import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createEvent } from "@/lib/db/events";
import { MAX_SONGS, MIN_SONGS, buildRounds, eventCode } from "@/lib/event/engine";
import { requireHost } from "@/lib/event/service";
import { GameError } from "@/lib/game/engine";
import { route } from "@/lib/http";
import { music } from "@/lib/music/provider";
import type { Track } from "@/lib/types";
import { requireUser } from "@/lib/session";

const Body = z.object({
  mode: z.enum(["screen", "phones"]),
  trackIds: z.array(z.string().regex(/^\d{1,15}$/)).min(MIN_SONGS).max(MAX_SONGS),
});

const CATALOG_CONCURRENCY = 4;

/**
 * Each artist's catalog, for wrong options that sound like the right one. Cached for a day;
 * an artist that can't be fetched (e.g. rate limit) just falls back to the host's songs.
 */
async function artistCatalogs(tracks: Track[]): Promise<Map<string, Track[]>> {
  const ids = [...new Set(tracks.map((t) => t.artistId).filter((id): id is string => Boolean(id)))];
  const catalog = new Map<string, Track[]>();
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const found = await music.artistTracks(id).catch(() => null);
      if (found) catalog.set(id, found.tracks);
    }
  };
  await Promise.all(Array.from({ length: CATALOG_CONCURRENCY }, worker));
  return catalog;
}

/** Creates a live event from the host's songs (in the host's order). */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  requireHost(user);
  const { mode, trackIds } = Body.parse(await req.json());
  const tracks = await music.tracksByIds(trackIds);
  if (tracks.length !== trackIds.length) throw new GameError("songs_unavailable", 422);
  const built = buildRounds(tracks, await artistCatalogs(tracks));
  const event = {
    id: randomUUID(),
    hostId: user.id,
    mode,
    status: "lobby" as const,
    currentRound: -1,
    roundStartsAt: null,
    tracks: built.tracks,
    rounds: built.rounds,
    createdAt: Date.now(),
  };
  const code = await createEvent(await getDb(), event, user, () => eventCode());
  return Response.json({ code }, { status: 201 });
});
