import { brandIcon } from "@/lib/brandIcon";

// iPhone and iPad home-screen icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandIcon(180);
}
