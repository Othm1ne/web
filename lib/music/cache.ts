// Stale-while-error cache for catalog lookups: entries refresh once their TTL passes (daily
// for track lists), and the stale copy is served if the refresh fails, e.g. when iTunes
// rate-limits us. A memory layer sits in front of a persistent store: a JSON file locally,
// Postgres when deployed (serverless instances are short-lived and can't write files).
import fs from "node:fs";
import path from "node:path";

export type Entry = { at: number; value: unknown };

export type CacheStore = {
  get(key: string): Promise<Entry | undefined>;
  set(key: string, entry: Entry): Promise<void>;
};

export type Cache = {
  get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T>;
};

/** Keeps every entry in one JSON file, written at most once a second. */
export function fileStore(file: string): CacheStore {
  let entries: Map<string, Entry> | null = null;
  let writeTimer: ReturnType<typeof setTimeout> | null = null;
  const all = () => {
    if (entries) return entries;
    entries = new Map();
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Entry>;
      for (const [k, v] of Object.entries(raw)) entries.set(k, v);
    } catch {}
    return entries;
  };
  return {
    get: async (key) => all().get(key),
    set: async (key, entry) => {
      all().set(key, entry);
      writeTimer ??= setTimeout(() => {
        writeTimer = null;
        try {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, JSON.stringify(Object.fromEntries(all())));
        } catch (err) {
          console.error("music cache write failed", err);
        }
      }, 1000);
    },
  };
}

export function createCache(store: CacheStore | null, now: () => number = Date.now): Cache {
  const memory = new Map<string, Entry>();
  const inflight = new Map<string, Promise<unknown>>();

  const lookup = async (key: string): Promise<Entry | undefined> => {
    const hit = memory.get(key);
    if (hit || !store) return hit;
    const stored = await store.get(key).catch((err) => {
      console.error("music cache read failed", err);
      return undefined;
    });
    if (stored) memory.set(key, stored);
    return stored;
  };

  return {
    async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const hit = await lookup(key);
      if (hit && now() - hit.at < ttlMs) return hit.value as T;
      // Concurrent misses share one upstream call, which matters under a 20 calls/min limit.
      let pending = inflight.get(key) as Promise<T> | undefined;
      if (!pending) {
        pending = load().then(async (value) => {
          const entry = { at: now(), value };
          memory.set(key, entry);
          await store?.set(key, entry).catch((err) => console.error("music cache write failed", err));
          return value;
        });
        inflight.set(key, pending);
        pending.finally(() => inflight.delete(key)).catch(() => {});
      }
      try {
        return await pending;
      } catch (err) {
        if (hit) return hit.value as T;
        throw err;
      }
    },
  };
}
