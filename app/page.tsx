import Link from "next/link";
import { OPTION_TONES } from "@/components/EventUI";
import { JoinBox } from "@/components/home/JoinBox";
import { PopularArtists } from "@/components/home/PopularArtists";
import { Equalizer } from "@/components/Logo";
import { TimerRing } from "@/components/TimerRing";
import { GENRES } from "@/lib/music/genres";

const MODES = [
  { href: "/play", icon: "🎤", title: "By artist", body: "Pick your favorite artist and prove you know every song." },
  { href: "/play?tab=genre", icon: "🎧", title: "By genre", body: "Pop, rap, afrobeats, anime… or type any genre. Current hits from many artists." },
  { href: "/host", icon: "📺", title: "Live event", body: "Pick the songs, share a code, play together on a big screen or phones." },
];

const STEPS = [
  { title: "Listen", body: "A clip starts. You have 10 seconds." },
  { title: "Tap the title", body: "Four choices, one right answer." },
  { title: "Be quick", body: "Up to 100 points a round. Faster answers score more." },
];

const FAQ = [
  { q: "How is the score calculated?", a: "A correct answer is worth up to 100 points and loses 5 points per second you wait (minimum 55). Wrong answers and timeouts score 0. A game has 10 rounds." },
  { q: "Do I need an account?", a: "No. You play as a guest with a random nickname you can change anytime. Sign in with Google to keep your scores on every device." },
  { q: "What's the difference between artist and genre games?", a: "An artist game uses songs from one artist. A genre game uses the current chart for that genre, so you'll hear lots of different artists." },
  { q: "Can I run a quiz night?", a: "Yes. Host a live event: pick the songs and which part of each plays, share the code, and players join on their phones. Music can play on one big screen or on every phone. Hosting needs a Google sign-in." },
  { q: "Where does the music come from?", a: "Short previews from the Apple iTunes catalog, streamed for preview only." },
];

// Made-up titles for the decorative game card.
const MOCK_OPTIONS = ["Midnight Static", "Paper Satellites", "Golden Hour Drive", "Neon Lullaby"];

function MockRound() {
  return (
    <div className="float relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="absolute -inset-x-2 -inset-y-6 rounded-[2.5rem] sm:-inset-6 bg-gradient-to-br from-lime/20 via-cyan/10 to-transparent blur-2xl" />
      <div className="relative flex flex-col gap-3 rounded-3xl border border-line bg-panel/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <Equalizer />
            <p className="font-display text-lg font-bold">What song is this?</p>
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

export default function Landing() {
  return (
    <div className="flex flex-col gap-16 pt-4 sm:pt-8">
      <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-left">
          <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-mute">
            Free music quiz · no account needed
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Hear it.
            <br />
            <span className="bg-gradient-to-r from-lime to-cyan bg-clip-text text-transparent">Name it.</span>
            <br />
            Fast.
          </h1>
          <p className="max-w-md text-lg text-mute">
            Ten clips, ten seconds each. Pick an artist or a genre, play solo, or run a quiz night with friends.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/play"
              className="rounded-2xl bg-lime px-7 py-4 text-center font-display text-lg font-bold text-ink shadow-[0_0_40px_-8px_var(--color-lime)] transition hover:scale-[1.03]"
            >
              Play solo
            </Link>
            <Link
              href="/host"
              className="rounded-2xl border-2 border-line px-7 py-4 text-center font-display text-lg font-bold transition hover:border-cyan"
            >
              Host a live event
            </Link>
          </div>
          <JoinBox />
        </div>
        <MockRound />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">Ways to play</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group flex flex-col gap-2 rounded-2xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-lime"
            >
              <span className="text-3xl" aria-hidden>
                {m.icon}
              </span>
              <span className="font-display text-lg font-bold">
                {m.title} <span className="inline-block text-lime transition group-hover:translate-x-1">→</span>
              </span>
              <span className="text-sm text-mute">{m.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">Jump into a genre</h2>
          <Link href="/play?tab=genre" className="text-sm text-cyan hover:underline">
            All genres
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
        <h2 className="font-display text-2xl font-bold">Popular artists</h2>
        <PopularArtists />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex items-start gap-4 rounded-2xl border border-line bg-panel p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel-2 font-display font-bold text-cyan">{i + 1}</span>
            <div>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-0.5 text-sm text-mute">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">Questions</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-line bg-panel px-5 py-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">
              <span className="mr-2 inline-block text-lime transition group-open:rotate-45">+</span>
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-mute">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
