import { describe, expect, it } from "vitest";
import { parseChartFeed } from "./chart";

const entry = (id: string, title: string, preview = true) => ({
  "im:name": { label: title },
  "im:artist": { label: "Artist", attributes: { href: "https://music.apple.com/us/artist/x/979458609?uo=2" } },
  "im:collection": { "im:name": { label: "Album" } },
  "im:image": [{ label: "https://img/55x55bb.png" }, { label: "https://img/170x170bb.png" }],
  link: [
    { attributes: { rel: "alternate", type: "text/html", href: "https://music.apple.com/..." } },
    ...(preview ? [{ attributes: { rel: "enclosure", type: "audio/x-m4a", href: `https://audio/${id}.m4a` } }] : []),
  ],
  id: { label: "https://...", attributes: { "im:id": id } },
});

describe("chart feed", () => {
  it("keeps songs with previews, deduped by title, with big artwork and the artist id", () => {
    const tracks = parseChartFeed({ feed: { entry: [entry("1", "Song"), entry("2", "Song (Remix)"), entry("3", "Other", false), entry("4", "Next")] } });
    expect(tracks.map((t) => t.id)).toEqual(["1", "4"]);
    expect(tracks[0]).toMatchObject({ title: "Song", artist: "Artist", album: "Album", previewUrl: "https://audio/1.m4a", artistId: "979458609", cover: "https://img/600x600bb.png" });
  });

  it("copes with a single entry or an empty feed", () => {
    expect(parseChartFeed({ feed: { entry: entry("9", "Solo") } })).toHaveLength(1);
    expect(parseChartFeed({ feed: {} })).toEqual([]);
    expect(parseChartFeed(null)).toEqual([]);
  });
});
