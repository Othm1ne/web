"use client";

import { useState } from "react";
import { type Genre, searchGenres } from "@/lib/music/genres";

/** Type any genre ("afrobeats", "grunge", "anime"…) and pick from the matching iTunes charts. */
export function GenreSearch({ onPick, disabled = false }: { onPick: (genre: Genre) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const matches = searchGenres(q);

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type any genre: afrobeats, grunge, anime…"
        aria-label="Search genres"
        className="rounded-xl border border-line bg-panel px-4 py-3 outline-none focus:border-cyan"
      />
      {q && (matches.length === 0 ? (
        <p className="text-sm text-mute">No genre matches &ldquo;{q}&rdquo;. Try a broader one, or search an artist.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {matches.map((g) => (
            <li key={g.itunesId}>
              <button
                onClick={() => {
                  onPick(g);
                  setQuery("");
                }}
                disabled={disabled}
                className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm transition hover:border-cyan disabled:opacity-60"
              >
                <span className="font-medium">{g.name}</span>
                {g.parent && <span className="text-mute"> · {g.parent}</span>}
              </button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
