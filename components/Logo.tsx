export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <rect x="2" y="9" width="3.5" height="6" rx="1.75" fill="var(--color-cyan)" />
        <rect x="7.5" y="4" width="3.5" height="16" rx="1.75" fill="var(--color-lime)" />
        <rect x="13" y="7" width="3.5" height="10" rx="1.75" fill="var(--color-lime)" />
        <path d="M18.5 6 L23 12 L18.5 18" stroke="var(--color-cyan)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Ear<span className="text-lime">Rush</span></span>
    </span>
  );
}

export function Equalizer({ playing = true }: { playing?: boolean }) {
  return (
    <span className="flex h-10 items-end gap-1" aria-hidden>
      {[0.1, 0.35, 0.2, 0.5, 0.05, 0.4, 0.25].map((delay, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-full bg-gradient-to-t from-cyan to-lime ${playing ? "eq-bar" : ""}`}
          style={{ height: "100%", animationDelay: `${delay}s`, transform: playing ? undefined : "scaleY(0.3)" }}
        />
      ))}
    </span>
  );
}
