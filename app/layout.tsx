import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { LanguageMenu } from "@/components/LanguageMenu";
import { Logo } from "@/components/Logo";
import { StatsChip } from "@/components/PlayerProgress";
import { TabBar } from "@/components/TabBar";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display-family", subsets: ["latin"], weight: ["500", "700"] });
const body = Inter({ variable: "--font-body-family", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EarRush: name that tune",
  description: "A fast music quiz. Pick an artist, hear a clip, tap the title before the clock runs out.",
  applicationName: "EarRush",
  // "Add to Home Screen" on iPhone: short name under the icon, full-screen app with the page behind the status bar.
  appleWebApp: { title: "EarRush", capable: true, statusBarStyle: "black-translucent" },
};

// Lets the bottom tab bar sit above the phone's home indicator.
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#070914" };

/** Everything that depends on the visitor's language (read from a cookie, hence the Suspense). */
async function Shell({ children }: { children: React.ReactNode }) {
  const { locale, d } = await getI18n();
  const links = [
    { href: "/join", label: d.nav.join },
    { href: "/leaderboard", label: d.nav.leaderboard },
  ];
  return (
    <I18nProvider locale={locale} dict={d}>
      <header className="sticky top-0 z-30 border-b border-line/50 bg-ink/70 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3">
          <Link href="/" aria-label={d.nav.home} className="me-auto">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="px-3 py-1.5 text-sm font-medium text-mute transition hover:text-white">
                {l.label}
              </Link>
            ))}
            <Link
              href="/play"
              className="btn-press me-1 rounded-full bg-lime px-4 py-1.5 text-sm font-bold text-ink [--press:#7fa316]"
            >
              {d.nav.play}
            </Link>
          </nav>
          <StatsChip />
          <LanguageMenu />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4 pb-10">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-4 pt-6 pb-24 text-xs text-mute sm:pb-6">{d.nav.footer}</footer>
      <TabBar />
    </I18nProvider>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <Suspense>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
