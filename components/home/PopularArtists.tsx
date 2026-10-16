"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ArtistSummary } from "@/lib/types";

/** The featured artists, loaded after the page so the home screen itself stays static and fast. */
export function PopularArtists() {
  const [artists, setArtists] = useState<ArtistSummary[] | null>(null);
  useEffect(() => {
    fetch("/api/artists")
      .then((r) => r.json())
      .then((d) => setArtists(d.artists ?? []))
      .catch(() => setArtists([]));
  }, []);

  if (artists?.length === 0) return null;
  return (
    <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
      {(artists ?? Array.from({ length: 8 }, () => null)).map((a, i) =>
        a ? (
          <Link key={a.id} href="/play" className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.image} alt="" className="h-24 w-24 rounded-full object-cover ring-2 ring-line transition group-hover:ring-lime" />
            <span className="line-clamp-1 text-sm font-medium">{a.name}</span>
          </Link>
        ) : (
          <span key={i} className="flex w-24 shrink-0 flex-col items-center gap-2">
            <span className="h-24 w-24 animate-pulse rounded-full bg-panel-2" />
            <span className="h-3 w-16 animate-pulse rounded bg-panel-2" />
          </span>
        ),
      )}
    </div>
  );
}
