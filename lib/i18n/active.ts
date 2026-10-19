// The browser's current dictionary, for code outside React (errorMessage in lib/client.ts).
// The I18nProvider sets it; English until then.
import { type Dict, en } from "./dictionaries/en";

let active: Dict = en;

export const setActiveDict = (dict: Dict) => {
  active = dict;
};

export const activeDict = () => active;
