import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display-family", subsets: ["latin"], weight: ["500", "700"] });
const body = Inter({ variable: "--font-body-family", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EarRush: name that tune",
  description: "A fast music quiz. Pick an artist, hear a clip, tap the title before the clock runs out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="EarRush home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/join" className="px-2 py-1.5 text-sm font-medium text-mute transition hover:text-white sm:px-3">
              Join
            </Link>
            <Link href="/leaderboard" className="px-2 py-1.5 text-sm font-medium text-mute transition hover:text-white sm:px-3">
              Leaderboard
            </Link>
            <Link
              href="/play"
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-mute transition hover:border-lime hover:text-lime"
            >
              Play
            </Link>
          </nav>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-4 py-6 text-xs text-mute">
          Music previews provided courtesy of Apple iTunes. EarRush is not affiliated with Apple.
        </footer>
      </body>
    </html>
  );
}
