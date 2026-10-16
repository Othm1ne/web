// Genres for solo "by genre" games. Each maps to an iTunes chart genre id; shared with the
// browser (no server imports). A game's source id is the artist's catalog id or "genre-<slug>".

export type Genre = { slug: string; name: string; itunesId: number; tone: string };

// `tone` is a Tailwind gradient for the genre's tile (written out in full so Tailwind generates it).
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
];

const PREFIX = "genre-";

export const genreSourceId = (slug: string) => `${PREFIX}${slug}`;

/** The genre for a source id like "genre-pop", or undefined for an artist id. */
export function genreFromSource(sourceId: string): Genre | undefined {
  return sourceId.startsWith(PREFIX) ? GENRES.find((g) => g.slug === sourceId.slice(PREFIX.length)) : undefined;
}

/** Valid game sources: an iTunes artist id, or a known genre. */
export const SOURCE_ID = /^(\d{1,15}|genre-[a-z-]{2,20})$/;
