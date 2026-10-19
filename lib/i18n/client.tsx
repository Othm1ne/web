"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { setActiveDict } from "./active";
import { LOCALES, LOCALE_COOKIE, type Locale, dirOf } from "./config";
import type { Dict } from "./dictionaries/en";

const I18nContext = createContext<{ locale: Locale; d: Dict } | null>(null);

/** Gives client components the dictionary the server picked for this visitor. */
export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  setActiveDict(dict);
  useEffect(() => {
    // The root <html> is static (outside the language Suspense), so set its language here.
    document.documentElement.lang = locale;
    document.documentElement.dir = dirOf(locale);
  }, [locale]);
  return <I18nContext.Provider value={{ locale, d: dict }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n needs an I18nProvider");
  return value;
}

/** Saves the choice in a cookie and re-renders the page in that language. */
export function LanguagePicker() {
  const { locale, d } = useI18n();
  const router = useRouter();
  return (
    <select
      value={locale}
      aria-label={d.nav.language}
      onChange={(e) => {
        document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className="rounded-full border border-line bg-panel px-2 py-1.5 text-sm text-mute outline-none focus:border-cyan"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}
