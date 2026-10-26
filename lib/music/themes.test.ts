import { describe, expect, it } from "vitest";
import { SOURCE_ID } from "./genres";
import { themeTrackIds } from "./source";
import { THEME_SONGS } from "./themeSongs";
import { THEMES, sourceName, themeFromSource, themeSourceId } from "./themes";

describe("themes", () => {
  it("has a song list for every theme and a theme for every song list", () => {
    expect(new Set(THEMES.map((t) => t.slug))).toEqual(new Set(Object.keys(THEME_SONGS)));
  });

  it("lists each song once per theme, as Artist|Title", () => {
    for (const [slug, songs] of Object.entries(THEME_SONGS)) {
      expect(songs.every((s) => /^[^|]+\|[^|]+$/.test(s)), slug).toBe(true);
      expect(new Set(songs).size, slug).toBe(songs.length);
    }
  });

  it("resolved enough songs for a game and its wrong options in every theme", () => {
    for (const t of THEMES) expect(themeTrackIds(t.slug).length, t.slug).toBeGreaterThanOrEqual(25);
  });

  it("round-trips theme source ids, which are valid game sources", () => {
    for (const t of THEMES) {
      expect(SOURCE_ID.test(themeSourceId(t.slug))).toBe(true);
      expect(themeFromSource(themeSourceId(t.slug))).toBe(t);
    }
    expect(themeFromSource("theme-nope")).toBeUndefined();
    expect(themeFromSource("genre-pop")).toBeUndefined();
    expect(SOURCE_ID.test("theme-../x")).toBe(false);
  });

  it("names themes in the viewer's language and leaves other sources alone", () => {
    expect(sourceName({ id: "theme-80s", name: "80s Hits" }, "fr")).toBe("Tubes des années 80");
    expect(sourceName({ id: "theme-80s", name: "80s Hits" }, "de")).toBe("Hits der 80er");
    expect(sourceName({ id: "159260351", name: "Daft Punk" }, "fr")).toBe("Daft Punk");
  });
});
