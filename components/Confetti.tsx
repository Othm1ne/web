"use client";

import { useState } from "react";

const COLORS = ["#c8f53c", "#2fd6e8", "#ff4fd8", "#8b5cf6", "#ffb020", "#ff6b5e"];

/** A one-off burst of falling confetti (hidden for people who prefer reduced motion). */
export function Confetti({ pieces = 90 }: { pieces?: number }) {
  // Random layout, computed once per burst.
  const [bits] = useState(() =>
    Array.from({ length: pieces }, (_, i) => ({
      left: Math.random() * 100,
      size: 6 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.8,
      dx: `${(Math.random() - 0.5) * 40}vw`,
      spin: `${(Math.random() - 0.5) * 1440}deg`,
      round: Math.random() > 0.6,
    })),
  );
  return (
    <div aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: `${b.left}%`,
              width: b.size,
              height: b.round ? b.size : b.size * 0.45,
              background: b.color,
              borderRadius: b.round ? 9999 : 2,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              "--dx": b.dx,
              "--spin": b.spin,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
