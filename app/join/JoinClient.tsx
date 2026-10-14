"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const clean = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export function JoinClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(() => clean(params.get("code") ?? ""));

  return (
    <form
      className="m-auto flex w-full max-w-sm flex-col gap-4 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) router.push(`/e/${code}`);
      }}
    >
      <h1 className="font-display text-3xl font-bold">Join an event</h1>
      <p className="text-mute">Enter the 6-character code shown on the host&apos;s screen.</p>
      <input
        value={code}
        onChange={(e) => setCode(clean(e.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoFocus
        placeholder="ABC123"
        aria-label="Event code"
        className="rounded-2xl border-2 border-line bg-panel px-4 py-4 text-center font-display text-4xl font-bold tracking-[0.3em] text-white uppercase outline-none placeholder:text-line focus:border-cyan"
      />
      <button disabled={code.length !== 6} className="rounded-2xl bg-lime py-4 font-display text-lg font-bold text-ink disabled:opacity-50">
        Continue
      </button>
      <p className="text-sm text-mute">
        Want to run one?{" "}
        <Link href="/host" className="text-cyan hover:underline">
          Host an event
        </Link>
      </p>
    </form>
  );
}
