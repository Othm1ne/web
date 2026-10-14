import Link from "next/link";
import { Equalizer } from "@/components/Logo";

const STEPS = [
  { title: "Pick an artist", body: "Search any artist in the catalog or start from our picks." },
  { title: "Listen closely", body: "Each round plays a short clip. You get 10 seconds." },
  { title: "Tap the title", body: "Four choices, one right answer. Faster answers score more." },
];

const FAQ = [
  { q: "How is the score calculated?", a: "A correct answer is worth up to 100 points and loses 5 points per second you wait (minimum 55). Wrong answers and timeouts score 0. A game has 10 rounds." },
  { q: "Do I need an account?", a: "No. You play as a guest with a random nickname you can change anytime." },
  { q: "Can I run a quiz night?", a: "Yes. Host a live event: pick the songs, share the code, and players join on their phones. Music can play on one big screen or on every phone. Hosting needs a Google sign-in." },
  { q: "Where does the music come from?", a: "Short previews from the Apple iTunes catalog, streamed for preview only." },
];

export default function Landing() {
  return (
    <div className="flex flex-col gap-16 pt-8">
      <section className="flex flex-col items-center gap-6 text-center">
        <Equalizer />
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Hear it. <span className="text-lime">Name it.</span> Fast.
        </h1>
        <p className="max-w-md text-lg text-mute">
          A 10-round music quiz built for quick reflexes. Pick an artist and beat the clock on every clip.
        </p>
        <Link
          href="/play"
          className="rounded-2xl bg-lime px-8 py-4 font-display text-lg font-bold text-ink shadow-[0_0_40px_-8px_var(--color-lime)] transition hover:scale-[1.03]"
        >
          Start playing
        </Link>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/host" className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-cyan">
            Host a live event
          </Link>
          <Link href="/join" className="rounded-full border border-line px-4 py-2 font-medium transition hover:border-cyan">
            Join with a code
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 font-display font-bold text-cyan">
              {i + 1}
            </div>
            <h2 className="font-display text-lg font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-mute">{s.body}</p>
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
