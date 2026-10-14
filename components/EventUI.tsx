import type { StandingRow } from "@/lib/event/types";
import type { PublicOption } from "@/lib/types";

// Each option keeps the same letter and color on the big screen and on every phone.
export const OPTION_TONES = [
  { letter: "A", ring: "border-coral", hover: "hover:border-coral", chip: "bg-coral", fill: "bg-coral/15" },
  { letter: "B", ring: "border-cyan", hover: "hover:border-cyan", chip: "bg-cyan", fill: "bg-cyan/15" },
  { letter: "C", ring: "border-lime", hover: "hover:border-lime", chip: "bg-lime", fill: "bg-lime/15" },
  { letter: "D", ring: "border-violet-400", hover: "hover:border-violet-400", chip: "bg-violet-400", fill: "bg-violet-400/15" },
];

export type OptionState = "idle" | "picked" | "correct" | "wrong" | "dim";

export function OptionCard({
  option,
  index,
  state = "idle",
  count,
  total,
  big = false,
  onClick,
}: {
  option: PublicOption;
  index: number;
  state?: OptionState;
  count?: number;
  total?: number;
  big?: boolean;
  onClick?: () => void;
}) {
  const tone = OPTION_TONES[index % OPTION_TONES.length];
  const frame =
    state === "correct"
      ? "border-lime bg-lime/15 shadow-[0_0_30px_-10px_var(--color-lime)]"
      : state === "wrong"
        ? "border-coral bg-coral/10"
        : state === "picked"
          ? `${tone.ring} ${tone.fill}`
          : state === "dim"
            ? "border-line bg-panel opacity-45"
            : `border-line bg-panel ${onClick ? tone.hover : ""}`;
  const share = count !== undefined && total ? Math.round((count / total) * 100) : null;
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 text-left transition ${frame} ${
        big ? "min-h-24 p-4 sm:min-h-28" : "min-h-20 p-3"
      } ${onClick ? "active:scale-[0.98]" : "cursor-default"}`}
    >
      {share !== null && (
        <span className={`absolute inset-y-0 left-0 ${tone.fill} transition-all duration-700`} style={{ width: `${share}%` }} />
      )}
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-xl font-display font-bold text-ink ${tone.chip} ${
          big ? "h-12 w-12 text-2xl" : "h-10 w-10 text-lg"
        }`}
      >
        {tone.letter}
      </span>
      {option.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.cover} alt="" className={`relative shrink-0 rounded-lg object-cover ${big ? "h-16 w-16" : "h-12 w-12"}`} />
      )}
      <span className={`relative line-clamp-2 flex-1 font-medium ${big ? "text-xl sm:text-2xl" : "text-base"}`}>{option.title}</span>
      {count !== undefined && <span className="relative font-display text-xl font-bold">{count}</span>}
    </button>
  );
}

export function Standings({ rows, limit = 10, big = false }: { rows: StandingRow[]; limit?: number; big?: boolean }) {
  if (rows.length === 0) return <p className="text-mute">No players yet.</p>;
  return (
    <ol className="flex flex-col gap-2">
      {rows.slice(0, limit).map((row, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 rounded-xl px-4 ${big ? "py-3 text-xl" : "py-2.5"} ${
            row.isYou ? "border border-lime bg-lime/10" : "bg-panel"
          }`}
        >
          <span className="w-10 font-display font-bold text-cyan">#{row.rank}</span>
          <span className="flex-1 truncate">
            {row.handle}
            {row.isYou && " (you)"}
          </span>
          <span className="font-display font-bold">{row.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function CountdownNumber({ ms, label }: { ms: number; label: string }) {
  const n = Math.max(1, Math.ceil(ms / 1000));
  return (
    <div className="m-auto flex flex-col items-center gap-4 text-center">
      <p className="text-sm uppercase tracking-widest text-mute">{label}</p>
      <span key={n} className="pop font-display text-8xl font-bold text-lime">
        {n}
      </span>
    </div>
  );
}
