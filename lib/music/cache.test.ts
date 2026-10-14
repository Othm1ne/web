import { describe, expect, it, vi } from "vitest";
import { type Entry, createCache } from "./cache";

describe("music cache", () => {
  it("serves fresh hits, refreshes after the TTL and shares concurrent loads", async () => {
    let t = 0;
    const cache = createCache(null, () => t);
    const load = vi.fn(async () => t);
    expect(await Promise.all([cache.get("k", 100, load), cache.get("k", 100, load)])).toEqual([0, 0]);
    t = 50;
    expect(await cache.get("k", 100, load)).toBe(0);
    t = 150;
    expect(await cache.get("k", 100, load)).toBe(150);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reads through to the persistent store and writes fresh values back", async () => {
    const saved = new Map<string, Entry>([["k", { at: 0, value: "stored" }]]);
    const store = { get: async (k: string) => saved.get(k), set: async (k: string, e: Entry) => void saved.set(k, e) };
    let t = 10;
    const cache = createCache(store, () => t);
    expect(await cache.get("k", 100, async () => "fresh")).toBe("stored");
    t = 500;
    expect(await cache.get("k", 100, async () => "fresh")).toBe("fresh");
    expect(saved.get("k")).toEqual({ at: 500, value: "fresh" });
  });

  it("falls back to the stale value when the refresh fails", async () => {
    let t = 0;
    const cache = createCache(null, () => t);
    await cache.get("k", 100, async () => "old");
    t = 500;
    expect(await cache.get("k", 100, async () => Promise.reject(new Error("rate limited")))).toBe("old");
    await expect(cache.get("other", 100, async () => Promise.reject(new Error("down")))).rejects.toThrow("down");
  });
});
