"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/client";
import type { LeaderboardRow } from "@/lib/types";

type Board = {
  players: number;
  top: LeaderboardRow[];
  you: LeaderboardRow | null;
  artists: { id: string; name: string }[];
  userCountry: string | null;
};

const PERIODS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];

const flag = (country: string | null) =>
  country ? String.fromCodePoint(...[...country].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "border-lime bg-lime/10 text-lime" : "border-line text-mute hover:border-cyan"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${row.isYou ? "border border-lime bg-lime/10" : "bg-panel"}`}>
      <span className="w-10 font-display font-bold text-cyan">#{row.rank}</span>
      <span className="w-6 text-center" aria-label={row.country ?? undefined}>{flag(row.country)}</span>
      <span className="flex-1 truncate">{row.handle}{row.isYou && " (you)"}</span>
      <span className="font-display font-bold">{row.score}</span>
    </div>
  );
}

export function LeaderboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const artistId = params.get("artistId") ?? "";
  const country = params.get("country") ?? "";
  const period = params.get("period") ?? "all";
  const query = params.toString();
  const [board, setBoard] = useState<{ query: string; data: Board } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/leaderboard?${query}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(errorMessage(d.error));
        setBoard({ query, data: d });
      })
      .catch((e) => setError(e.message));
  }, [query]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  const data = board?.data;
  const loading = board?.query !== query;
  const youShown = data?.top.some((r) => r.isYou);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
        <p className="text-mute">Each player&apos;s best game counts.</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={!artistId} onClick={() => set("artistId", "")}>All artists</Chip>
          {data?.artists.map((a) => (
            <Chip key={a.id} active={artistId === a.id} onClick={() => set("artistId", a.id)}>{a.name}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip active={!country} onClick={() => set("country", "")}>Global</Chip>
          {(data?.userCountry || country) && (
            <Chip active={!!country} onClick={() => set("country", country || data!.userCountry!)}>
              {flag(country || data!.userCountry)} My country
            </Chip>
          )}
          <span className="mx-1 w-px bg-line" />
          {PERIODS.map((p) => (
            <Chip key={p.id} active={period === p.id} onClick={() => set("period", p.id === "all" ? "" : p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-coral">{error}</p>
      ) : !data ? (
        <p className="text-mute">Loading scores…</p>
      ) : (
        <section className={`flex flex-col gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <p className="text-sm text-mute">{data.players} {data.players === 1 ? "player" : "players"}</p>
          {data.top.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel p-8 text-center">
              <p>No scores here yet.</p>
              <Link href="/play" className="rounded-2xl bg-lime px-6 py-3 font-display font-bold text-ink">
                Be the first
              </Link>
            </div>
          ) : (
            data.top.map((row, i) => <Row key={i} row={row} />)
          )}
          {data.you && !youShown && (
            <>
              <p className="text-center text-mute">⋯</p>
              <Row row={data.you} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
