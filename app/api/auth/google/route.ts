import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { authorizationUrl, canonicalSignInUrl, safeReturnTo } from "@/lib/google";
import { route } from "@/lib/http";

const OAUTH_COOKIE = "earrush_oauth";

/** Starts Google sign-in. The state cookie ties the callback to this browser (CSRF protection). */
export const GET = route(async (req: NextRequest) => {
  const canonical = canonicalSignInUrl(req.url);
  if (canonical) return Response.redirect(canonical, 302);
  const state = randomBytes(16).toString("base64url");
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/api/auth/google",
  });
  return Response.redirect(authorizationUrl(req.nextUrl.origin, state), 302);
});
