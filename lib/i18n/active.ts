// The browser's current dictionary, for code outside React (errorMessage in lib/client.ts).
// The I18nProvider sets it; English until then.
import { LOCALE_COOKIE, type Locale } from "./config";
import { type Dict, en } from "./dictionaries/en";

let active: Dict = en;

export const setActiveDict = (dict: Dict) => {
  active = dict;
};

export const activeDict = () => active;

/** Remembers the visitor's language choice for a year (read on the server by getI18n). */
export function saveLocale(code: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}
