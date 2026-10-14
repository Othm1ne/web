import { z } from "zod";
import { route } from "@/lib/http";
import { signInGuest } from "@/lib/session";

const Body = z.object({ handle: z.string().trim().min(2).max(24).optional() });

/** Starts a guest session, or renames the current player when a handle is given. */
export const POST = route(async (req: Request) => {
  const { handle } = Body.parse(await req.json().catch(() => ({})));
  return Response.json({ user: await signInGuest(handle) });
});
