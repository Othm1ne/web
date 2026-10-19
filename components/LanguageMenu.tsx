"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveLocale } from "@/lib/i18n/active";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

/** Globe button in the header; the choice is saved in a cookie and the page re-renders in it. */
export function LanguageMenu() {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function choose(code: Locale) {
    saveLocale(code);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={d.nav.language}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-1 rounded-full border border-line bg-panel/80 px-2.5 text-sm font-bold uppercase text-mute backdrop-blur transition hover:border-cyan hover:text-white"
      >
        <span aria-hidden>🌐</span>
        {locale}
      </button>
      {open && (
        <ul role="menu" className="pop absolute end-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-line bg-panel p-1 shadow-2xl">
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                role="menuitemradio"
                aria-checked={l.code === locale}
                onClick={() => choose(l.code)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm transition ${
                  l.code === locale ? "bg-lime/10 font-bold text-lime" : "hover:bg-panel-2"
                }`}
              >
                {l.name}
                {l.code === locale && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
