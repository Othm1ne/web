// Queries for live events. Each takes the Db so tests can use an in-memory PGlite.
import { GameError } from "../game/engine";
import type { EventAnswer, EventRound, LiveEvent } from "../event/engine";
import type { EventPlayer } from "../event/view";
import type { Track, User } from "../types";
import type { Db } from "./index";

type EventRow = {
  id: string;
  code: string;
  host_id: string;
  host_handle: string;
  mode: LiveEvent["mode"];
  status: LiveEvent["status"];
  current_round: number;
  round_starts_at: number | null;
  data: EventData | string;
  created_at: number;
};

type EventData = { tracks: Track[]; rounds: EventRound[] };

const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === "23505";

/** Stores a new event, drawing a fresh code until one is free. */
export async function createEvent(db: Db, event: Omit<LiveEvent, "code" | "hostHandle">, host: User, newCode: () => string) {
  await db.query(`insert into users (id, handle, provider, country) values ($1, $2, $3, $4) on conflict (id) do nothing`, [
    host.id, host.handle, host.provider, host.country,
  ]);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await db.query(
        `insert into events (id, code, host_id, mode, status, current_round, data, created_at)
         values ($1, $2, $3, $4, 'lobby', -1, $5::text::jsonb, $6)`,
        [event.id, code, event.hostId, event.mode, JSON.stringify({ tracks: event.tracks, rounds: event.rounds }), new Date(event.createdAt).toISOString()],
      );
      return code;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new GameError("server_busy", 503);
}

export async function loadEvent(db: Db, code: string): Promise<LiveEvent | null> {
  const [row] = await db.query<EventRow>(
    `select e.id, e.code, e.host_id, u.handle as host_handle, e.mode, e.status, e.current_round,
       (extract(epoch from e.round_starts_at) * 1000)::float8 as round_starts_at, e.data,
       (extract(epoch from e.created_at) * 1000)::float8 as created_at
     from events e join users u on u.id = e.host_id where e.code = $1`,
    [code],
  );
  if (!row) return null;
  // The JSON is sent as text and cast in SQL: with a plain "$1::jsonb" the postgres driver
  // double-encodes strings (PGlite doesn't). Rows written that way still parse here.
  const data: EventData = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  return {
    id: row.id,
    code: row.code,
    hostId: row.host_id,
    hostHandle: row.host_handle,
    mode: row.mode,
    status: row.status,
    currentRound: row.current_round,
    roundStartsAt: row.round_starts_at,
    tracks: data.tracks,
    rounds: data.rounds,
    createdAt: row.created_at,
  };
}

export async function joinEvent(db: Db, eventId: string, user: User) {
  await db.query(
    `insert into event_players (event_id, user_id, handle) values ($1, $2, $3)
     on conflict (event_id, user_id) do update set handle = excluded.handle`,
    [eventId, user.id, user.handle],
  );
}

/** Players with their score from rounds before `currentRound` (the view adds the current one at the reveal). */
export async function loadPlayers(db: Db, eventId: string, currentRound: number): Promise<EventPlayer[]> {
  return db.query<EventPlayer>(
    `select p.user_id as "userId", p.handle,
       coalesce(sum(a.points) filter (where a.round < $2), 0)::int as score,
       (extract(epoch from p.joined_at) * 1000)::float8 as "joinedAt"
     from event_players p
     left join event_answers a on a.event_id = p.event_id and a.user_id = p.user_id
     where p.event_id = $1
     group by p.user_id, p.handle, p.joined_at`,
    [eventId, currentRound],
  );
}

export async function loadAnswers(db: Db, eventId: string, round: number): Promise<EventAnswer[]> {
  if (round < 0) return [];
  return db.query<EventAnswer>(
    `select user_id as "userId", option_id as "optionId", elapsed_ms as "elapsedMs", correct, points
     from event_answers where event_id = $1 and round = $2`,
    [eventId, round],
  );
}

/** Saves an answer; a second answer to the same round is refused. */
export async function saveAnswer(db: Db, eventId: string, round: number, a: EventAnswer) {
  const rows = await db.query(
    `insert into event_answers (event_id, round, user_id, option_id, elapsed_ms, correct, points)
     values ($1, $2, $3, $4, $5, $6, $7) on conflict do nothing returning round`,
    [eventId, round, a.userId, a.optionId, a.elapsedMs, a.correct, a.points],
  );
  if (rows.length === 0) throw new GameError("already_answered", 409);
}

/** Moves the event on, unless another request (a double click) already did. */
export async function saveProgress(db: Db, event: LiveEvent, next: Pick<LiveEvent, "status" | "currentRound" | "roundStartsAt">) {
  const rows = await db.query(
    `update events set status = $3, current_round = $4, round_starts_at = $5
     where id = $1 and current_round = $2 and status = $6 returning id`,
    [
      event.id,
      event.currentRound,
      next.status,
      next.currentRound,
      next.roundStartsAt === null ? null : new Date(next.roundStartsAt).toISOString(),
      event.status,
    ],
  );
  return rows.length > 0;
}
