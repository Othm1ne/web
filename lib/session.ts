// Sessions: an HMAC-signed cookie holding the player's id, handle, provider and country.
// The users table is the source of truth; the cookie saves a lookup per request.
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { getDb } from "./db";
import { saveUser } from "./db/repo";
import { GameError } from "./game/engine";
import type { User } from "./types";

export const SESSION_COOKIE = "earrush_session";
const MAX_AGE_S = 365 * 24 * 60 * 60;

const ADJECTIVES = ["Swift", "Loud", "Neon", "Lucky", "Cosmic", "Velvet", "Electric", "Mellow", "Rapid", "Golden"];
const NOUNS = ["Fox", "Drummer", "Comet", "Echo", "Falcon", "Groove", "Tempo", "Riff", "Otter", "Synth"];
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export const randomHandle = () => `${pick(ADJECTIVES)}${pick(NOUNS)}${Math.floor(Math.random() * 900 + 100)}`;

/** SESSION_SECRET in production; in development a generated secret is kept in data/ so sessions survive restarts. */
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  const file = path.join(process.cwd(), "data", "session-secret");
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    const value = randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
    return value;
  }
}

const sign = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64url");

export function encodeSession(user: User, key = secret()): string {
  const data = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${data}.${sign(data, key)}`;
}

export function decodeSession(token: string | undefined, key = secret()): User | null {
  if (!token) return null;
  const [data, mac] = token.split(".");
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const user = JSON.parse(Buffer.from(data, "base64url").toString()) as User;
    return typeof user.id === "string" && typeof user.handle === "string" ? user : null;
  } catch {
    return null;
  }
}

/** Country from the edge (Vercel/Cloudflare) or, failing that, the browser locale's region. */
export function countryFrom(h: Pick<Headers, "get">): string | null {
  const edge = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  if (edge && /^[A-Z]{2}$/.test(edge) && edge !== "XX") return edge;
  const region = h.get("accept-language")?.match(/^[a-z]{2,3}-([A-Z]{2})\b/i)?.[1];
  return region ? region.toUpperCase() : null;
}

export async function currentUser(): Promise<User | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new GameError("unauthorized", 401);
  return user;
}

export async function setSession(user: User) {
  (await cookies()).set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_S,
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Creates the guest (or renames the current player) and sets the session cookie. */
export async function signInGuest(handle?: string): Promise<User> {
  const existing = await currentUser();
  const user: User = existing
    ? { ...existing, handle: handle ?? existing.handle }
    : { id: randomUUID(), handle: handle ?? randomHandle(), provider: "guest", country: countryFrom(await headers()) };
  await saveUser(await getDb(), user);
  await setSession(user);
  return user;
}
