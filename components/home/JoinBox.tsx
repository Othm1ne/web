"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const clean = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** Join a live event straight from the home screen. */
export function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) router.push(`/e/${code}`);
      }}
      className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-line bg-panel/80 p-1.5 pl-4 backdrop-blur"
    >
      <span className="shrink-0 text-sm text-mute">Code</span>
      <input
        value={code}
        onChange={(e) => setCode(clean(e.target.value))}
        placeholder="ABC123"
        aria-label="Event code"
        autoCapitalize="characters"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold tracking-[0.25em] uppercase outline-none placeholder:text-line"
      />
      <button
        disabled={code.length !== 6}
        className="shrink-0 rounded-xl bg-cyan px-4 py-2 font-display font-bold text-ink transition disabled:opacity-40"
      >
        Join
      </button>
    </form>
  );
}
