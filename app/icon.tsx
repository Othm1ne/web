import { brandIcon } from "@/lib/brandIcon";

// Browser tab and Android install icon (favicon.ico stays for old browsers).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return brandIcon(512);
}
