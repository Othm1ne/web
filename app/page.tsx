import Link from "next/link";
import { OPTION_TONES } from "@/components/EventUI";
import { JoinBox } from "@/components/home/JoinBox";
import { PopularArtists } from "@/components/home/PopularArtists";
import { ProgressCard } from "@/components/PlayerProgress";
import { Equalizer } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import type { Dict } from "@/lib/i18n/dictionaries/en";
import { getI18n } from "@/lib/i18n/server";
import { GENRES } from "@/lib/music/genres";

// Made-up titles for the decorative game card.
const MOCK_OPTIONS = ["Midnight Static", "Paper Satellites", "Golden Hour Drive", "Neon Lullaby"];

function MockRound({ d }: { d: Dict }) {
  return (
    <div className="float relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="absolute -inset-x-2 -inset-y-6 rounded-[2.5rem] sm:-inset-6 bg-gradient-to-br from-lime/20 via-cyan/10 to-transparent blur-2xl" />
      <div className="relative flex flex-col gap-3 rounded-3xl border border-line bg-panel/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Equalizer />
            <p className="font-display text-lg font-bold">{d.common.whatSong}</p>
          </div>
          <TimerRing remaining={7300} total={10000} />
        </div>
        {MOCK_OPTIONS.map((title, i) => {
          const tone = OPTION_TONES[i];
          const correct = i === 2;
          return (
            <div
              key={title}
              className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 ${correct ? "border-lime bg-lime/15" : "border-line bg-panel-2/60"}`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-display font-bold text-ink ${tone.chip}`}>{tone.letter}</span>
              <span className="flex-1 text-sm font-medium">{title}</span>
              {correct && <span className="pop font-display font-bold text-lime">+95</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function Landing() {
  const { d } = await getI18n();
  const h = d.home;
  const modes = [
    { href: "/play", icon: "🎤", title: h.modeArtist, body: h.modeArtistBody, tone: "from-lime/25 hover:border-lime" },
    { href: "/play?tab=genre", icon: "🎧", title: h.modeGenre, body: h.modeGenreBody, tone: "from-cyan/25 hover:border-cyan" },
    { href: "/host", icon: "📺", title: h.modeLive, body: h.modeLiveBody, tone: "from-pink/25 hover:border-pink" },
  ];
  const steps = [
    { title: h.step1, body: h.step1Body },
    { title: h.step2, body: h.step2Body },
    { title: h.step3, body: h.step3Body },
  ];
  const faq = [
    { q: h.faqScoreQ, a: h.faqScoreA },
    { q: h.faqAccountQ, a: h.faqAccountA },
    { q: h.faqGenreQ, a: h.faqGenreA },
    { q: h.faqQuizQ, a: h.faqQuizA },
    { q: h.faqMusicQ, a: h.faqMusicA },
  ];

  return (
    <div className="flex flex-col gap-16 pt-4 sm:pt-8">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-start">
          <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-mute">{h.badge}</span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {h.hero1}
            <br />
            <span className="text-gradient">{h.hero2}</span>
            <br />
            {h.hero3}
          </h1>
          <p className="max-w-md text-lg text-mute">{h.intro}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/play"
              className="btn-press rounded-2xl bg-lime px-8 py-4 text-center font-display text-xl font-bold text-ink"
            >
              {d.common.playSolo}
            </Link>
            <Link
              href="/host"
              className="btn-press rounded-2xl border-2 border-violet bg-violet/20 px-7 py-4 text-center font-display text-lg font-bold [--press:#4c2a99]"
            >
              {h.host}
            </Link>
          </div>
          <JoinBox />
        </div>
        <MockRound d={d} />
      </section>

      <ProgressCard />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">{h.waysToPlay}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {modes.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`group flex flex-col gap-2 rounded-3xl border-2 border-line bg-gradient-to-br to-panel p-5 transition hover:-translate-y-1 ${m.tone}`}
            >
              <span className="text-4xl transition group-hover:scale-110 group-hover:-rotate-6" aria-hidden>
                {m.icon}
              </span>
              <span className="font-display text-lg font-bold">
                {m.title} <span className="inline-block text-lime transition group-hover:translate-x-1 rtl:-scale-x-100">→</span>
              </span>
              <span className="text-sm text-mute">{m.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">{h.jumpGenre}</h2>
          <Link href="/play?tab=genre" className="text-sm text-cyan hover:underline">
            {h.allGenres}
          </Link>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {GENRES.slice(0, 16).map((g) => (
            <Link
              key={g.slug}
              href={`/play?genre=${g.slug}`}
              className={`relative flex h-28 w-36 shrink-0 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 transition hover:scale-[1.03] ${g.tone}`}
            >
              <span className="absolute -right-2 -top-4 font-display text-7xl font-bold text-white/15" aria-hidden>
                ♪
              </span>
              <span className="relative font-display font-bold leading-tight text-white drop-shadow">{g.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">{h.popularArtists}</h2>
        <PopularArtists />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-4 rounded-2xl border border-line bg-panel p-5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-ink ${["bg-lime", "bg-cyan", "bg-pink"][i]}`}>{i + 1}</span>
            <div>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-0.5 text-sm text-mute">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">{h.questions}</h2>
        {faq.map((f, i) => (
          <details key={i} className="group rounded-2xl border border-line bg-panel px-5 py-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="me-2 inline-block text-lime transition group-open:rotate-45">+</span>
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-mute">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
