import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { signInGoogle } from "@/lib/db/repo";
import { exchangeCode, safeReturnTo } from "@/lib/google";
import { currentUser, randomHandle, setSession } from "@/lib/session";

const OAUTH_COOKIE = "earrush_oauth";

// Not wrapped in route(): every outcome is a redirect back into the app, never a JSON error.
export async function GET(req: NextRequest) {
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  let saved: { state?: string; returnTo?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {}
  const returnTo = safeReturnTo(saved.returnTo ?? null);
  const back = (status: string) => {
    const url = new URL(returnTo, req.nextUrl.origin);
    url.searchParams.set("signin", status);
    return Response.redirect(url, 302);
  };

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  if (params.get("error") || !code) return back("cancelled");
  if (!saved.state || params.get("state") !== saved.state) return back("failed");

  try {
    const profile = await exchangeCode(req.nextUrl.origin, code);
    const user = await signInGoogle(await getDb(), profile, await currentUser(), randomHandle());
    await setSession(user);
    return back("ok");
  } catch (err) {
    console.error("google sign-in failed", err);
    return back("failed");
  }
}
