// The visitor's language on the server. Reads cookies, so callers must sit inside <Suspense>
// (cacheComponents): the root layout wraps the whole app in one.
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale, pickLocale } from "./config";
import type { Dict } from "./dictionaries/en";

// Only the visitor's dictionary is loaded.
const DICTIONARIES: Record<Locale, () => Promise<Dict>> = {
  en: () => import("./dictionaries/en").then((m) => m.en),
  fr: () => import("./dictionaries/fr").then((m) => m.fr),
  es: () => import("./dictionaries/es").then((m) => m.es),
  de: () => import("./dictionaries/de").then((m) => m.de),
  pt: () => import("./dictionaries/pt").then((m) => m.pt),
  ar: () => import("./dictionaries/ar").then((m) => m.ar),
};

export const getDictionary = (locale: Locale) => DICTIONARIES[locale]();

export async function getI18n(): Promise<{ locale: Locale; d: Dict }> {
  const [jar, head] = await Promise.all([cookies(), headers()]);
  const locale = pickLocale(jar.get(LOCALE_COOKIE)?.value, head.get("accept-language"));
  return { locale, d: await getDictionary(locale) };
}
