// Google sign-in (OpenID Connect authorization-code flow) without an auth library.
import { GameError } from "./game/engine";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GameError("google_not_configured", 501);
  return { clientId, clientSecret };
}

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/**
 * Where sign-in must run. With APP_URL set, a request arriving on any other address (Vercel
 * gives a project several) is sent there first, so only one redirect URI needs registering
 * with Google and the state cookie and callback share an origin. Null means "stay here".
 */
export function canonicalSignInUrl(requestUrl: string, appUrl = process.env.APP_URL): string | null {
  if (!appUrl) return null;
  const here = new URL(requestUrl);
  const home = new URL(appUrl);
  if (here.origin === home.origin) return null;
  return new URL(here.pathname + here.search, home.origin).toString();
}

/** Must match an "Authorized redirect URI" in the Google Cloud console exactly. */
export const redirectUri = (origin: string) => `${process.env.APP_URL ?? origin}/api/auth/google/callback`;

export function authorizationUrl(origin: string, state: string): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config().clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type IdClaims = { sub: string; email: string | null };

/**
 * Reads the ID token's claims. The token comes straight from Google's token endpoint over
 * TLS, so (per Google's docs) checking issuer, audience and expiry is enough; no signature check.
 */
export function parseIdToken(token: string, clientId: string, nowMs = Date.now()): IdClaims {
  const part = token.split(".")[1];
  if (!part) throw new GameError("google_bad_token");
  let claims: { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean };
  try {
    claims = JSON.parse(Buffer.from(part, "base64url").toString());
  } catch {
    throw new GameError("google_bad_token");
  }
  if (!ISSUERS.includes(claims.iss ?? "") || claims.aud !== clientId || !claims.sub) throw new GameError("google_bad_token");
  if (!claims.exp || claims.exp * 1000 < nowMs) throw new GameError("google_bad_token");
  return { sub: claims.sub, email: claims.email && claims.email_verified ? claims.email : null };
}

export async function exchangeCode(origin: string, code: string): Promise<IdClaims> {
  const { clientId, clientSecret } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("google token exchange failed", res.status, await res.text());
    throw new GameError("google_failed", 502);
  }
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new GameError("google_failed", 502);
  return parseIdToken(id_token, clientId);
}

/** Only same-site paths, so the sign-in flow can't be used as an open redirect. */
export const safeReturnTo = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/play";
