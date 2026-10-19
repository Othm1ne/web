// Queries for players and finished games. Each takes the Db so tests can use an in-memory PGlite.
import { randomUUID } from "node:crypto";
import type { Game } from "../game/engine";
import { totalScore } from "../game/engine";
import { unrankedReason } from "../game/integrity";
import { dayNumber } from "../game/progress";
import type { BoardFilter, Entry, Period } from "../game/leaderboard";
import type { Player, User } from "../types";
import type { Db } from "./index";

type UserRow = { id: string; handle: string; provider: string; country: string | null };

const toUser = (r: UserRow): User => ({
  id: r.id,
  handle: r.handle,
  provider: r.provider === "google" ? "google" : "guest",
  country: r.country,
});

/** Creates the player row, or updates the handle if it exists. */
export async function saveUser(db: Db, user: User) {
  await db.query(
    `insert into users (id, handle, provider, country) values ($1, $2, $3, $4)
     on conflict (id) do update set handle = excluded.handle`,
    [user.id, user.handle, user.provider, user.country],
  );
}

export type GoogleProfile = { sub: string; email: string | null };

/**
 * Signs a Google account in. A returning account gets its existing player back; a new one
 * takes over the current guest (keeping its nickname and scores) unless that guest is
 * already linked to another Google account.
 */
export async function signInGoogle(db: Db, profile: GoogleProfile, guest: User | null, fallbackHandle: string): Promise<User> {
  const [existing] = await db.query<UserRow>(
    `update users set email = $2 where google_sub = $1 returning id, handle, provider, country`,
    [profile.sub, profile.email],
  );
  if (existing) return toUser(existing);

  if (guest) {
    const [linked] = await db.query<UserRow>(
      `insert into users (id, handle, provider, google_sub, email, country) values ($1, $2, 'google', $3, $4, $5)
       on conflict (id) do update set provider = 'google', google_sub = excluded.google_sub, email = excluded.email
       where users.google_sub is null
       returning id, handle, provider, country`,
      [guest.id, guest.handle, profile.sub, profile.email, guest.country],
    );
    if (linked) return toUser(linked);
  }

  const [created] = await db.query<UserRow>(
    `insert into users (id, handle, provider, google_sub, email, country) values ($1, $2, 'google', $3, $4, $5)
     returning id, handle, provider, country`,
    [randomUUID(), guest?.handle ?? fallbackHandle, profile.sub, profile.email, guest?.country ?? null],
  );
  return toUser(created);
}

export async function recordResult(db: Db, game: Game) {
  const player: Player = game.player;
  // Sessions created before the database existed may not have a row yet.
  await db.query(
    `insert into users (id, handle, country) values ($1, $2, $3) on conflict (id) do nothing`,
    [player.id, player.handle, player.country],
  );
  const answered = game.rounds.filter((r) => r.answer);
  const avgMs = answered.length ? Math.round(answered.reduce((s, r) => s + r.answer!.elapsedMs, 0) / answered.length) : 0;
  await db.query(
    `insert into games (id, user_id, mode, artist_id, artist_name, score, correct_count, avg_ms, started_at, finished_at, ranked)
     values ($1, $2, 'artist', $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (id) do nothing`,
    [
      game.id,
      player.id,
      game.artist.id,
      game.artist.name,
      totalScore(game),
      answered.filter((r) => r.answer!.correct).length,
      avgMs,
      new Date(game.createdAt).toISOString(),
      new Date(game.finishedAt ?? Date.now()).toISOString(),
      unrankedReason(game) === null,
    ],
  );
}

/**
 * A player's lifetime points (ranked games only, so flagged games can't farm levels), best
 * score, and the local dates (in `timeZone`, an IANA name) they finished a game in the last
 * year, as day numbers for the daily streak.
 */
export async function playerTotals(db: Db, userId: string, timeZone = "UTC", now = Date.now()) {
  const [totals] = await db.query<{ xp: number; best: number }>(
    `select coalesce(sum(score), 0)::int as xp, coalesce(max(score), 0)::int as best
     from games where user_id = $1 and ranked`,
    [userId],
  );
  const days = await db.query<{ day: string }>(
    `select distinct to_char(finished_at at time zone $3, 'YYYY-MM-DD') as day
     from games where user_id = $1 and finished_at >= $2`,
    [userId, new Date(now - 367 * 86_400_000).toISOString(), timeZone],
  );
  return { ...totals, days: days.map((r) => dayNumber(r.day)) };
}

/** The player's best ranked score on a source before this game, or null if it's their first. */
export async function previousBest(db: Db, userId: string, artistId: string, gameId: string): Promise<number | null> {
  const [row] = await db.query<{ best: number | null }>(
    `select max(score)::int as best from games where user_id = $1 and artist_id = $2 and id <> $3 and ranked`,
    [userId, artistId, gameId],
  );
  return row?.best ?? null;
}

const PERIOD_MS: Record<Period, number> = { day: 86_400_000, week: 7 * 86_400_000, all: 0 };

/** Each player's best game matching the filter (earliest wins ties), ready for rankPlayers. */
export async function bestEntries(db: Db, filter: BoardFilter, now = Date.now()): Promise<Entry[]> {
  const period = filter.period ?? "all";
  const since = period === "all" ? new Date(0) : new Date(now - PERIOD_MS[period]);
  return db.query<Entry>(
    `select distinct on (g.user_id)
       g.id as "gameId", g.user_id as "userId", u.handle, u.country,
       g.artist_id as "artistId", g.artist_name as "artistName", g.score,
       (extract(epoch from g.finished_at) * 1000)::float8 as "at"
     from games g join users u on u.id = g.user_id
     where g.ranked
       and ($1::text is null or g.artist_id = $1)
       and ($2::text is null or u.country = $2)
       and g.finished_at >= $3
     order by g.user_id, g.score desc, g.finished_at asc`,
    [filter.artistId ?? null, filter.country ?? null, since.toISOString()],
  );
}

/** Artists with at least one finished game, most played first (for the leaderboard filter). */
export async function playedArtists(db: Db, limit = 20) {
  return db.query<{ id: string; name: string }>(
    `select artist_id as id, max(artist_name) as name from games
     group by artist_id order by count(*) desc limit $1`,
    [limit],
  );
}
