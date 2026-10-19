import { describe, expect, it } from "vitest";
import { LOCALES, fmt, pickLocale } from "./config";
import { type Dict, en } from "./dictionaries/en";
import { getDictionary } from "./server";

/** Every string in a dictionary, keyed by its path ("home.badge"). */
function flatten(dict: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dict).flatMap(([k, v]) =>
      typeof v === "string" ? [[`${prefix}${k}`, v]] : Object.entries(flatten(v, `${prefix}${k}.`)),
    ),
  );
}
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("pickLocale", () => {
  it("prefers the saved choice, then the browser's languages in order, then English", () => {
    expect(pickLocale("de", "fr-FR,fr;q=0.9")).toBe("de");
    expect(pickLocale(undefined, "fr-FR,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(pickLocale(undefined, "ja,es;q=0.7,en;q=0.5")).toBe("es");
    expect(pickLocale(undefined, "en;q=0.4,ar-MA;q=0.9")).toBe("ar");
    expect(pickLocale("xx", "ja")).toBe("en");
    expect(pickLocale(undefined, null)).toBe("en");
  });
});

describe("fmt", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(fmt("{n} of {total}", { n: 2, total: 10 })).toBe("2 of 10");
    expect(fmt("{n} {x}", { n: 1 })).toBe("1 {x}");
  });
});

describe("dictionaries", () => {
  it("translate every string with the same placeholders as English", async () => {
    const base = flatten(en);
    for (const { code } of LOCALES) {
      const dict: Dict = await getDictionary(code);
      const strings = flatten(dict);
      expect(Object.keys(strings).sort(), code).toEqual(Object.keys(base).sort());
      for (const [key, value] of Object.entries(strings)) {
        expect(value.trim(), `${code} ${key}`).not.toBe("");
        expect(placeholders(value), `${code} ${key}`).toEqual(placeholders(base[key]));
      }
    }
  });
});
