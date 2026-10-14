// Music cache entries in Postgres, shared by every serverless instance.
import type { CacheStore } from "../music/cache";
import { getDb } from "./index";

export const dbCacheStore: CacheStore = {
  async get(key) {
    const db = await getDb();
    const [row] = await db.query<{ value: unknown; at: number }>(
      `select value, (extract(epoch from fetched_at) * 1000)::float8 as at from music_cache where key = $1`,
      [key],
    );
    return row ? { at: row.at, value: row.value } : undefined;
  },
  async set(key, entry) {
    const db = await getDb();
    // Sent as text and cast in SQL: "$1::jsonb" with a string makes the postgres driver double-encode.
    await db.query(
      `insert into music_cache (key, value, fetched_at) values ($1, $2::text::jsonb, $3)
       on conflict (key) do update set value = excluded.value, fetched_at = excluded.fetched_at`,
      [key, JSON.stringify(entry.value), new Date(entry.at).toISOString()],
    );
  },
};
