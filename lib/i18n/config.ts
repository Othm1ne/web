// Supported languages and how a visitor's language is chosen. Shared by server and browser.
// The language lives in a cookie (no /fr/… URLs), so links, sign-in redirects and event codes
// stay the same in every language.

export const LOCALES = [
  { code: "en", name: "English", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
  { code: "de", name: "Deutsch", dir: "ltr" },
  { code: "pt", name: "Português", dir: "ltr" },
  { code: "ar", name: "العربية", dir: "rtl" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "earrush_locale";

export const isLocale = (value: string | undefined | null): value is Locale => LOCALES.some((l) => l.code === value);

export const dirOf = (locale: Locale) => LOCALES.find((l) => l.code === locale)!.dir;

/** The saved choice, else the browser's preferred supported language (Accept-Language), else English. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((x) => x.lang).find(isLocale) ?? DEFAULT_LOCALE;
}

/** Fills {name} placeholders: fmt("{n} songs", { n: 3 }) → "3 songs". */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}
