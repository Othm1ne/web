// Browser-side API helpers. Identity lives in an httpOnly session cookie set by the server.
import { activeDict } from "./i18n/active";
import type { User } from "./types";

export type { User };

async function call<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(errorMessage(data.error));
  return data as T;
}

/** The current player (starting a guest session on first visit) and whether Google sign-in is available. */
export async function ensureUser(): Promise<{ user: User; google: boolean }> {
  const { user, google } = await call<{ user: User | null; google: boolean }>("/api/auth/me");
  return { user: user ?? (await call<{ user: User }>("/api/auth/guest", { method: "POST" })).user, google };
}

export async function signOut(): Promise<void> {
  await call("/api/auth/logout", { method: "POST" });
}

export const googleSignInUrl = (returnTo: string) => `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`;

export async function renameUser(handle: string): Promise<User> {
  return (await call<{ user: User }>("/api/auth/guest", { method: "POST", body: { handle } })).user;
}

export async function createGame(artistId: string): Promise<string> {
  return (await call<{ id: string }>("/api/games", { method: "POST", body: { artistId } })).id;
}

/** The player-facing message for an API error code, in the visitor's language. */
export function errorMessage(code?: string): string {
  const errors = activeDict().errors;
  return code && code !== "generic" && code in errors ? errors[code as keyof typeof errors] : errors.generic;
}
