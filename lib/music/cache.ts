// Persistent stale-while-error cache for catalog lookups. Entries survive restarts in
// data/music-cache.json, refresh once their TTL passes (daily for track lists), and the
// stale copy is served if the refresh fails, e.g. when iTunes rate-limits us.
import fs from "node:fs";
import path from "node:path";

type Entry = { at: number; value: unknown };

export type Cache = {
  get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T>;
};

export function createCache(file: string | null, now: () => number = Date.now): Cache {
  let entries: Map<string, Entry> | null = null;
  const inflight = new Map<string, Promise<unknown>>();
  let writeTimer: ReturnType<typeof setTimeout> | null = null;

  const store = () => {
    if (entries) return entries;
    entries = new Map();
    if (file) {
      try {
        const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Entry>;
        for (const [k, v] of Object.entries(raw)) entries.set(k, v);
      } catch {}
    }
    return entries;
  };

  const persist = () => {
    if (!file || writeTimer) return;
    writeTimer = setTimeout(() => {
      writeTimer = null;
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(Object.fromEntries(store())));
      } catch (err) {
        console.error("music cache write failed", err);
      }
    }, 1000);
  };

  return {
    async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const hit = store().get(key);
      if (hit && now() - hit.at < ttlMs) return hit.value as T;
      // Concurrent misses share one upstream call, which matters under a 20 calls/min limit.
      let pending = inflight.get(key) as Promise<T> | undefined;
      if (!pending) {
        pending = load().then((value) => {
          store().set(key, { at: now(), value });
          persist();
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
