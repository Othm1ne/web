// Blind-test themes: hand-picked songs around an era, a pop-culture topic, a language or a mood.
// Shared with the browser (no server imports); the song lists live in themeSongs.ts. A theme's
// source id is "theme-<slug>", and slugs are kept forever because leaderboards are keyed by them.
import type { Locale } from "../i18n/config";

export type ThemeCategory = "eras" | "culture" | "world" | "moods";

export type Theme = {
  slug: string;
  category: ThemeCategory;
  icon: string;
  /** Tailwind gradient for the theme's tile, written out in full so Tailwind generates it. */
  tone: string;
  names: Record<Locale, string>;
};

export const THEME_CATEGORIES: ThemeCategory[] = ["eras", "culture", "world", "moods"];

/** "80s" → "80s Hits", "Tubes des années 80", "Hits der 80er"… */
const decade = (slug: string, tone: string, icon: string, ar: string): Theme => {
  const n = slug.slice(0, -1);
  return {
    slug,
    category: "eras",
    icon,
    tone,
    names: { en: `${slug} Hits`, fr: `Tubes des années ${n}`, es: `Éxitos de los ${n}`, de: `Hits der ${n}er`, pt: `Sucessos dos anos ${n}`, ar },
  };
};

export const THEMES: Theme[] = [
  decade("60s", "from-orange-400 to-pink-600", "🌼", "أغاني الستينات"),
  decade("70s", "from-amber-400 to-orange-700", "🪩", "أغاني السبعينات"),
  decade("80s", "from-fuchsia-500 to-cyan-500", "📼", "أغاني الثمانينات"),
  decade("90s", "from-violet-500 to-lime-400", "💿", "أغاني التسعينات"),
  decade("2000s", "from-sky-400 to-pink-500", "📱", "أغاني الألفينات"),
  decade("2010s", "from-indigo-500 to-rose-500", "🎧", "أغاني 2010–2019"),
  decade("2020s", "from-emerald-400 to-indigo-600", "🔥", "أغاني 2020 وما بعدها"),
  {
    slug: "hip-hop-classics",
    category: "eras",
    icon: "🎤",
    tone: "from-amber-500 to-zinc-900",
    names: { en: "Hip-Hop Classics", fr: "Classiques du hip-hop", es: "Clásicos del hip-hop", de: "Hip-Hop-Klassiker", pt: "Clássicos do hip-hop", ar: "كلاسيكيات الهيب هوب" },
  },
  {
    slug: "rock-classics",
    category: "eras",
    icon: "🎸",
    tone: "from-red-600 to-zinc-900",
    names: { en: "Rock Classics", fr: "Classiques du rock", es: "Clásicos del rock", de: "Rock-Klassiker", pt: "Clássicos do rock", ar: "كلاسيكيات الروك" },
  },
  {
    slug: "disney",
    category: "culture",
    icon: "🏰",
    tone: "from-sky-500 to-violet-700",
    names: { en: "Disney", fr: "Disney", es: "Disney", de: "Disney", pt: "Disney", ar: "ديزني" },
  },
  {
    slug: "movies",
    category: "culture",
    icon: "🎬",
    tone: "from-red-500 to-slate-900",
    names: { en: "Movie Hits", fr: "Musiques de films", es: "Canciones de película", de: "Filmhits", pt: "Músicas de filmes", ar: "أغاني الأفلام" },
  },
  {
    slug: "summer",
    category: "culture",
    icon: "🏖️",
    tone: "from-yellow-300 to-orange-500",
    names: { en: "Summer Hits", fr: "Tubes de l’été", es: "Canciones del verano", de: "Sommerhits", pt: "Hits de verão", ar: "أغاني الصيف" },
  },
  {
    slug: "viral",
    category: "culture",
    icon: "📲",
    tone: "from-cyan-400 to-pink-600",
    names: { en: "Viral & TikTok", fr: "Viral & TikTok", es: "Virales y TikTok", de: "Viral & TikTok", pt: "Virais e TikTok", ar: "تريندات وتيك توك" },
  },
  {
    slug: "eurovision",
    category: "culture",
    icon: "🎙️",
    tone: "from-blue-600 to-pink-500",
    names: { en: "Eurovision", fr: "Eurovision", es: "Eurovisión", de: "Eurovision", pt: "Eurovisão", ar: "يوروفيجن" },
  },
  {
    slug: "french-classics",
    category: "world",
    icon: "🥖",
    tone: "from-blue-700 to-red-500",
    names: { en: "French Classics", fr: "Variété française", es: "Clásicos franceses", de: "Französische Klassiker", pt: "Clássicos franceses", ar: "كلاسيكيات فرنسية" },
  },
  {
    slug: "french-pop",
    category: "world",
    icon: "🗼",
    tone: "from-rose-400 to-blue-600",
    names: { en: "French Hits", fr: "Pop française", es: "Éxitos franceses", de: "Französische Hits", pt: "Sucessos franceses", ar: "أغاني فرنسية حديثة" },
  },
  {
    slug: "rap-fr",
    category: "world",
    icon: "🎧",
    tone: "from-zinc-600 to-blue-800",
    names: { en: "French Rap", fr: "Rap français", es: "Rap francés", de: "Französischer Rap", pt: "Rap francês", ar: "راب فرنسي" },
  },
  {
    slug: "arabic",
    category: "world",
    icon: "🌙",
    tone: "from-emerald-500 to-amber-600",
    names: { en: "Arabic & Raï", fr: "Arabe & raï", es: "Árabe y raï", de: "Arabisch & Raï", pt: "Árabe e raï", ar: "أغاني عربية وراي" },
  },
  {
    slug: "latin",
    category: "world",
    icon: "💃",
    tone: "from-yellow-400 to-rose-600",
    names: { en: "Latin Hits", fr: "Tubes latinos", es: "Éxitos latinos", de: "Latin-Hits", pt: "Sucessos latinos", ar: "أغاني لاتينية" },
  },
  {
    slug: "italian",
    category: "world",
    icon: "🍕",
    tone: "from-green-600 to-red-600",
    names: { en: "Italian Hits", fr: "Chansons italiennes", es: "Éxitos italianos", de: "Italienische Hits", pt: "Sucessos italianos", ar: "أغاني إيطالية" },
  },
  {
    slug: "party",
    category: "moods",
    icon: "🎉",
    tone: "from-fuchsia-500 to-orange-400",
    names: { en: "Party Anthems", fr: "Spécial soirée", es: "Himnos de fiesta", de: "Party-Hymnen", pt: "Hinos de festa", ar: "أغاني الحفلات" },
  },
  {
    slug: "love-songs",
    category: "moods",
    icon: "💘",
    tone: "from-rose-500 to-red-700",
    names: { en: "Love Songs", fr: "Chansons d’amour", es: "Canciones de amor", de: "Liebeslieder", pt: "Canções de amor", ar: "أغاني حب" },
  },
  {
    slug: "karaoke",
    category: "moods",
    icon: "🎤",
    tone: "from-purple-500 to-cyan-500",
    names: { en: "Karaoke Classics", fr: "Classiques du karaoké", es: "Clásicos del karaoke", de: "Karaoke-Klassiker", pt: "Clássicos do karaokê", ar: "كلاسيكيات الكاريوكي" },
  },
  {
    slug: "one-hit-wonders",
    category: "moods",
    icon: "⭐",
    tone: "from-yellow-400 to-violet-700",
    names: { en: "One-Hit Wonders", fr: "Les tubes d’un seul succès", es: "Éxitos de una sola vez", de: "One-Hit-Wonder", pt: "One-hit wonders", ar: "أغاني النجاح الوحيد" },
  },
];

const PREFIX = "theme-";
const bySlug = new Map(THEMES.map((t) => [t.slug, t]));

export const themeSourceId = (slug: string) => `${PREFIX}${slug}`;

/** The theme for a source id like "theme-80s", or undefined for any other source. */
export const themeFromSource = (sourceId: string): Theme | undefined =>
  sourceId.startsWith(PREFIX) ? bySlug.get(sourceId.slice(PREFIX.length)) : undefined;

export const themeName = (theme: Theme, locale: Locale) => theme.names[locale] ?? theme.names.en;

/** A game source's display name in the viewer's language: themes are translated, others aren't. */
export const sourceName = (source: { id: string; name: string }, locale: Locale) => {
  const theme = themeFromSource(source.id);
  return theme ? themeName(theme, locale) : source.name;
};
