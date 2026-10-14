import { googleEnabled } from "@/lib/google";
import { route } from "@/lib/http";
import { currentUser } from "@/lib/session";

export const GET = route(async () => Response.json({ user: await currentUser(), google: googleEnabled() }));
