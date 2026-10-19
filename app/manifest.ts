import type { MetadataRoute } from "next";

// Lets Android and desktop browsers install EarRush like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EarRush: name that tune",
    short_name: "EarRush",
    description: "A fast music quiz. Hear a clip, tap the title before the clock runs out.",
    start_url: "/",
    display: "standalone",
    background_color: "#070914",
    theme_color: "#070914",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
