// Genres for solo "by genre" games. Each maps to an iTunes chart genre id; shared with the
// browser (no server imports). A game's source id is the artist's catalog id or "genre-<key>",
// where key is a featured genre's slug or any catalog genre's chart id.
import { GENRE_CATALOG } from "./genreCatalog";

export type Genre = { slug: string; name: string; itunesId: number; tone: string; parent?: string };

// `tone` is a Tailwind gradient for the genre's tile (written out in full so Tailwind generates it).
// Featured genres keep their slugs forever: leaderboards are keyed by "genre-<slug>".
export const GENRES: Genre[] = [
  { slug: "pop", name: "Pop", itunesId: 14, tone: "from-pink-500 to-orange-400" },
  { slug: "hip-hop", name: "Hip-Hop / Rap", itunesId: 18, tone: "from-amber-500 to-red-600" },
  { slug: "rnb", name: "R&B / Soul", itunesId: 15, tone: "from-purple-600 to-pink-500" },
  { slug: "rock", name: "Rock", itunesId: 21, tone: "from-red-600 to-zinc-800" },
  { slug: "alternative", name: "Alternative", itunesId: 20, tone: "from-teal-500 to-indigo-700" },
  { slug: "dance", name: "Dance", itunesId: 17, tone: "from-fuchsia-500 to-cyan-500" },
  { slug: "electronic", name: "Electronic", itunesId: 7, tone: "from-cyan-400 to-blue-700" },
  { slug: "latin", name: "Latin", itunesId: 12, tone: "from-yellow-400 to-rose-600" },
  { slug: "k-pop", name: "K-Pop", itunesId: 51, tone: "from-sky-400 to-violet-500" },
  { slug: "french-pop", name: "French Pop", itunesId: 50000064, tone: "from-blue-600 to-rose-500" },
  { slug: "country", name: "Country", itunesId: 6, tone: "from-orange-500 to-amber-800" },
  { slug: "metal", name: "Metal", itunesId: 1153, tone: "from-zinc-500 to-zinc-900" },
  { slug: "reggae", name: "Reggae", itunesId: 24, tone: "from-green-500 to-yellow-500" },
  { slug: "jazz", name: "Jazz", itunesId: 11, tone: "from-amber-700 to-indigo-900" },
  { slug: "afrobeats", name: "Afrobeats", itunesId: 100051, tone: "from-lime-500 to-emerald-700" },
  { slug: "amapiano", name: "Amapiano", itunesId: 42, tone: "from-emerald-400 to-sky-700" },
  { slug: "reggaeton", name: "Reggaeton / Urbano", itunesId: 1119, tone: "from-rose-500 to-amber-500" },
  { slug: "musica-mexicana", name: "Música Mexicana", itunesId: 1123, tone: "from-green-600 to-red-600" },
  { slug: "brazilian", name: "Brazilian", itunesId: 1122, tone: "from-green-500 to-yellow-400" },
  { slug: "j-pop", name: "J-Pop", itunesId: 27, tone: "from-rose-400 to-fuchsia-600" },
  { slug: "anime", name: "Anime", itunesId: 29, tone: "from-violet-500 to-rose-500" },
  { slug: "bollywood", name: "Bollywood", itunesId: 1263, tone: "from-orange-500 to-pink-600" },
  { slug: "indie-pop", name: "Indie Pop", itunesId: 100020, tone: "from-sky-400 to-emerald-500" },
  { slug: "punk", name: "Punk", itunesId: 1006, tone: "from-lime-400 to-zinc-900" },
  { slug: "grunge", name: "Grunge", itunesId: 1003, tone: "from-stone-500 to-stone-900" },
  { slug: "house", name: "House", itunesId: 1048, tone: "from-indigo-500 to-fuchsia-500" },
  { slug: "disco", name: "Disco", itunesId: 1137, tone: "from-yellow-300 to-pink-500" },
  { slug: "funk", name: "Funk", itunesId: 1139, tone: "from-orange-400 to-purple-700" },
  { slug: "soul", name: "Soul", itunesId: 1143, tone: "from-amber-600 to-rose-800" },
  { slug: "blues", name: "Blues", itunesId: 2, tone: "from-blue-500 to-indigo-900" },
  { slug: "classical", name: "Classical", itunesId: 5, tone: "from-slate-400 to-slate-800" },
  { slug: "soundtrack", name: "Movie Soundtracks", itunesId: 16, tone: "from-red-500 to-slate-900" },
  { slug: "video-game", name: "Video Game", itunesId: 100032, tone: "from-cyan-500 to-violet-700" },
  { slug: "christmas", name: "Christmas", itunesId: 1080, tone: "from-red-600 to-green-700" },
];

const PREFIX = "genre-";

// Catalog genres that aren't featured get a tone picked from their id, so a genre always looks the same.
const TONES = [
  "from-pink-500 to-violet-600",
  "from-cyan-500 to-blue-700",
  "from-amber-500 to-rose-600",
  "from-emerald-500 to-teal-800",
  "from-fuchsia-500 to-indigo-700",
  "from-orange-500 to-red-700",
];

const featuredById = new Map(GENRES.map((g) => [g.itunesId, g]));

const catalog: Genre[] = GENRE_CATALOG.map(
  ([itunesId, name, parent]) =>
    featuredById.get(itunesId) ?? { slug: String(itunesId), name, itunesId, tone: TONES[itunesId % TONES.length], parent },
);
const catalogById = new Map(catalog.map((g) => [g.itunesId, g]));

/** The source id for a genre: "genre-<slug>", which is "genre-<chart id>" for non-featured ones. */
export const genreSourceId = (slug: string) => `${PREFIX}${slug}`;

/** The genre for a source id like "genre-pop" or "genre-1048", or undefined for an artist id. */
export function genreFromSource(sourceId: string): Genre | undefined {
  if (!sourceId.startsWith(PREFIX)) return undefined;
  const key = sourceId.slice(PREFIX.length);
  return /^\d+$/.test(key) ? catalogById.get(Number(key)) : GENRES.find((g) => g.slug === key);
}

/** Valid game sources: an iTunes artist id, a genre key, or a theme slug (see themes.ts). */
export const SOURCE_ID = /^(\d{1,15}|genre-([a-z-]{2,20}|\d{1,9})|theme-[a-z0-9-]{2,30})$/;

/** Lowercase, no accents, and punctuation as spaces: "Coupé-Décalé" → "coupe decale". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const compact = (s: string) => s.replace(/ /g, "");

// What people type that isn't a genre's own name.
const ALIASES: Record<string, number> = {
  rap: 18,
  hiphop: 18,
  rnb: 15,
  randb: 15,
  edm: 17,
  techno: 1050,
  dnb: 1049,
  drumandbass: 1049,
  reggaeton: 1119,
  urbano: 1119,
  movies: 16,
  movie: 16,
  film: 16,
  films: 16,
  ost: 16,
  games: 100032,
  gaming: 100032,
  videogames: 100032,
  xmas: 1080,
  noel: 1080,
  arab: 1197,
  french: 50000064,
  chanson: 50000064,
  german: 50000066,
  indian: 1263,
  kpop: 51,
  korean: 51,
  japanese: 27,
  emo: 100018,
  gospel: 1101,
  worship: 1103,
  oldies: 1293,
  musicals: 1166,
  broadway: 1166,
};

/** Genres matching what the user typed, best first: aliases, then names, then parent genres. */
export function searchGenres(query: string, limit = 8): Genre[] {
  const q = fold(query);
  if (!q) return [];
  const qc = compact(q);
  const scored: { g: Genre; score: number }[] = [];
  const alias = ALIASES[qc];
  for (const g of catalog) {
    const name = fold(g.name);
    const words = name.split(" ");
    let score =
      g.itunesId === alias || compact(name) === qc ? 0
      : name.startsWith(q) || compact(name).startsWith(qc) ? 1
      : words.some((w) => w.startsWith(q)) ? 2
      : name.includes(q) ? 3
      : g.parent && fold(g.parent).startsWith(q) ? 4
      : -1;
    if (score < 0) continue;
    // Featured and top-level genres first among equals: "rock" → Rock before Rock y Alternativo.
    if (!featuredById.has(g.itunesId)) score += 0.5;
    if (g.parent) score += 0.25;
    scored.push({ g, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.g.name.length - b.g.name.length)
    .slice(0, limit)
    .map((x) => x.g);
}
