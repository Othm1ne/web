"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

// Screens that fill the phone themselves (a game, its results, hosting, an event).
const HIDDEN = [/^\/game\//, /^\/results\//, /^\/host/, /^\/e\//];

/** App-style bottom navigation on phones. Desktop uses the header links. */
export function TabBar() {
  const { d } = useI18n();
  const path = usePathname();
  if (HIDDEN.some((re) => re.test(path))) return null;
  const tabs = [
    { href: "/", icon: "🏠", label: d.nav.tabHome, color: "text-cyan" },
    { href: "/play", icon: "🎧", label: d.nav.play, color: "text-lime" },
    { href: "/join", icon: "📲", label: d.nav.join, color: "text-pink" },
    { href: "/leaderboard", icon: "🏆", label: d.nav.tabRanks, color: "text-amber" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden">
      <ul className="grid h-16 grid-cols-4">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${active ? t.color : "text-mute"}`}
              >
                <span className={`text-xl transition ${active ? "scale-110" : "opacity-70 grayscale"}`} aria-hidden>
                  {t.icon}
                </span>
                {t.label}
                <span className={`h-1 w-6 rounded-full ${active ? "bg-current" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
