// The app icon (home screen, browser tab, install prompt), drawn for next/og's ImageResponse:
// the logo's equalizer bars and arrow on a full-bleed dark tile with a colored glow. Full bleed
// because iOS and Android round the corners themselves.
import { ImageResponse } from "next/og";

export function brandIcon(size: number) {
  const mark = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 20%, #3b1d7a 0%, #160f33 45%, #070914 100%)",
        }}
      >
        <svg width={mark} height={mark} viewBox="0 0 24 24">
          <rect x="2" y="9" width="3.5" height="6" rx="1.75" fill="#2fd6e8" />
          <rect x="7.5" y="4" width="3.5" height="16" rx="1.75" fill="#c8f53c" />
          <rect x="13" y="7" width="3.5" height="10" rx="1.75" fill="#c8f53c" />
          <path d="M18.5 6 L23 12 L18.5 18" stroke="#ff4fd8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
