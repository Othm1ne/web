"use client";

import { createContext, useContext, useEffect } from "react";
import { setActiveDict } from "./active";
import { type Locale, dirOf } from "./config";
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
