export function TimerRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const color = frac > 0.5 ? "var(--color-lime)" : frac > 0.25 ? "#facc15" : "var(--color-coral)";
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="var(--color-line)" strokeWidth="5" fill="none" />
        <circle
          cx="32" cy="32" r={r} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold">
        {Math.ceil(remaining / 1000)}
      </span>
    </div>
  );
}
