import { describe, expect, it } from "vitest";
import { GENRE_CATALOG } from "./genreCatalog";
import { GENRES, SOURCE_ID, genreFromSource, genreSourceId, searchGenres } from "./genres";

const names = (q: string) => searchGenres(q).map((g) => g.name);

describe("genres", () => {
  it("round-trips genre source ids and leaves artist ids alone", () => {
    expect(genreFromSource(genreSourceId("k-pop"))?.name).toBe("K-Pop");
    expect(genreFromSource("159260351")).toBeUndefined();
    expect(genreFromSource("genre-nope")).toBeUndefined();
    expect(genreFromSource("genre-999999")).toBeUndefined();
  });

  it("finds catalog genres by chart id, and featured ones keep their slug", () => {
    const house = searchGenres("house").find((g) => g.name === "House")!;
    expect(house.slug).toBe("house");
    const techno = searchGenres("techno")[0];
    expect(techno).toMatchObject({ name: "Techno", slug: "1050", parent: "Dance" });
    expect(genreFromSource(genreSourceId(techno.slug))).toEqual(techno);
  });

  it("accepts only artist ids and genre ids as sources", () => {
    expect(GENRES.every((g) => SOURCE_ID.test(genreSourceId(g.slug)))).toBe(true);
    expect(SOURCE_ID.test("genre-1050")).toBe(true);
    expect(SOURCE_ID.test("159260351")).toBe(true);
    expect(SOURCE_ID.test("genre-../x")).toBe(false);
    expect(SOURCE_ID.test("abc")).toBe(false);
  });

  it("has unique slugs and chart ids, all of them in the catalog", () => {
    expect(new Set(GENRES.map((g) => g.slug)).size).toBe(GENRES.length);
    expect(new Set(GENRES.map((g) => g.itunesId)).size).toBe(GENRES.length);
    expect(new Set(GENRE_CATALOG.map(([id]) => id)).size).toBe(GENRE_CATALOG.length);
    const ids = new Set(GENRE_CATALOG.map(([id]) => id));
    expect(GENRES.filter((g) => !ids.has(g.itunesId))).toEqual([]);
  });

  it("matches what people type", () => {
    expect(names("rap")[0]).toBe("Hip-Hop / Rap");
    expect(names("kpop")[0]).toBe("K-Pop");
    expect(names("EDM")[0]).toBe("Dance");
    expect(names("rock")[0]).toBe("Rock");
    expect(names("coupe decale")).toContain("Coupé-Décalé");
    expect(names("afro").slice(0, 3)).toContain("Afrobeats");
    expect(names("drum and bass")[0]).toBe("Jungle/Drum'n'bass");
    expect(searchGenres("  ")).toEqual([]);
    expect(searchGenres("zzzz")).toEqual([]);
    expect(searchGenres("a", 5)).toHaveLength(5);
  });
});
