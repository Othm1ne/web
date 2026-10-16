import { describe, expect, it } from "vitest";
import { GENRES, SOURCE_ID, genreFromSource, genreSourceId } from "./genres";

describe("genres", () => {
  it("round-trips genre source ids and leaves artist ids alone", () => {
    expect(genreFromSource(genreSourceId("k-pop"))?.name).toBe("K-Pop");
    expect(genreFromSource("159260351")).toBeUndefined();
    expect(genreFromSource("genre-nope")).toBeUndefined();
  });

  it("accepts only artist ids and genre ids as sources", () => {
    expect(GENRES.every((g) => SOURCE_ID.test(genreSourceId(g.slug)))).toBe(true);
    expect(SOURCE_ID.test("159260351")).toBe(true);
    expect(SOURCE_ID.test("genre-../x")).toBe(false);
    expect(SOURCE_ID.test("abc")).toBe(false);
  });

  it("has unique slugs and chart ids", () => {
    expect(new Set(GENRES.map((g) => g.slug)).size).toBe(GENRES.length);
    expect(new Set(GENRES.map((g) => g.itunesId)).size).toBe(GENRES.length);
  });
});
