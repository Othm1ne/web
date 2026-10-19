// Solo games in progress. They live in Postgres rather than memory because on serverless
// hosting each request can land on a different instance.
import type { Game } from "../game/engine";
import { GameError } from "../game/engine";
import type { Track } from "../types";
import type { Db } from "./index";

const TTL_HOURS = 3;

type Stored = Omit<Game, "tracks"> & { tracks: Track[] };
export type LoadedGame = { game: Game; version: number };

const toStored = (game: Game): Stored => ({ ...game, tracks: [...game.tracks.values()] });
const fromStored = (s: Stored): Game => ({ ...s, tracks: new Map(s.tracks.map((t) => [t.id, t])) });

export async function insertLiveGame(db: Db, game: Game) {
  // Opportunistic cleanup of abandoned games.
  await db.query(`delete from live_games where created_at < now() - interval '${TTL_HOURS} hours'`);
  // Sent as text and cast in SQL: "$1::jsonb" with a string makes the postgres driver double-encode.
  await db.query(
    `insert into live_games (id, user_id, state, version, created_at) values ($1, $2, $3::text::jsonb, 0, $4)`,
    [game.id, game.player.id, JSON.stringify(toStored(game)), new Date(game.createdAt).toISOString()],
  );
}

export async function loadLiveGame(db: Db, id: string): Promise<LoadedGame | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.query<{ state: Stored | string; version: number }>(
    `select state, version from live_games where id = $1`,
    [id],
  );
  if (!row) return null;
  return { game: fromStored(typeof row.state === "string" ? JSON.parse(row.state) : row.state), version: row.version };
}

/** How many solo games the player started in the last `windowMs` (finished or not). */
export async function countRecentGames(db: Db, userId: string, windowMs: number, now = Date.now()): Promise<number> {
  const [row] = await db.query<{ n: number }>(
    `select count(*)::int as n from live_games where user_id = $1 and created_at > $2`,
    [userId, new Date(now - windowMs).toISOString()],
  );
  return row.n;
}

/** Saves a changed game unless another request changed it first (e.g. a double tap). */
export async function updateLiveGame(db: Db, { game, version }: LoadedGame) {
  const rows = await db.query(
    `update live_games set state = $3::text::jsonb, version = version + 1 where id = $1 and version = $2 returning id`,
    [game.id, version, JSON.stringify(toStored(game))],
  );
  if (rows.length === 0) throw new GameError("wrong_round", 409);
}
