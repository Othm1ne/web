import { route } from "@/lib/http";
import { clearSession } from "@/lib/session";

/** Signs out. The next visit starts a fresh guest. */
export const POST = route(async () => {
  await clearSession();
  return Response.json({ ok: true });
});
