"use client";

import { useI18n } from "@/lib/i18n/client";
import { THEMES, THEME_CATEGORIES, type Theme, themeName, themeSourceId } from "@/lib/music/themes";

/** Blind-test theme tiles, grouped by category. Used by solo games and by event hosts. */
export function ThemePicker({
  onPick,
  selectedId,
  busyId,
  disabled,
  compact,
}: {
  onPick: (theme: Theme) => void;
  selectedId?: string;
  /** The theme whose songs are loading, shown on its tile. */
  busyId?: string | null;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { d, locale } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      {THEME_CATEGORIES.map((category) => (
        <section key={category} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium uppercase tracking-widest text-mute">{d.themes[category]}</h3>
          <div className={`grid grid-cols-2 sm:grid-cols-4 ${compact ? "gap-2" : "gap-3"}`}>
            {THEMES.filter((t) => t.category === category).map((t) => {
              const id = themeSourceId(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => onPick(t)}
                  disabled={disabled}
                  className={`relative flex items-end overflow-hidden bg-gradient-to-br text-start transition disabled:opacity-60 ${t.tone} ${
                    compact ? "h-16 rounded-xl p-2.5" : "aspect-[4/3] rounded-2xl p-3"
                  } ${selectedId === id ? "ring-4 ring-lime" : "hover:scale-[1.02]"}`}
                >
                  <span className={`absolute -right-1 -top-1 opacity-80 ${compact ? "text-2xl" : "text-4xl"}`} aria-hidden>
                    {t.icon}
                  </span>
                  <span className={`relative font-display font-bold leading-tight text-white drop-shadow ${compact ? "" : "text-lg"}`}>
                    {busyId === id ? d.sourceFill.adding : themeName(t, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
