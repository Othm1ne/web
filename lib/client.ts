// Browser-side API helpers. Identity lives in an httpOnly session cookie set by the server.
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

export function errorMessage(code?: string): string {
  switch (code) {
    case "not_enough_tracks":
      return "This artist doesn't have enough playable tracks yet. Try another one.";
    case "music_rate_limited":
      return "The music catalog is busy. Wait a minute and try again.";
    case "game_not_found":
      return "This game has expired. Start a new one.";
    case "unauthorized":
      return "Your session expired. Reload the page to continue.";
    case "invalid_request":
      return "Nicknames need 2 to 24 characters.";
    case "event_not_found":
      return "No event with that code. Check the code on the host's screen.";
    case "event_over":
      return "This event has ended.";
    case "host_cannot_play":
      return "You're hosting this event, so you can't join it as a player.";
    case "host_needs_google":
      return "Sign in with Google to host an event.";
    case "no_players":
      return "Wait for at least one player to join.";
    case "not_enough_songs":
      return "Pick at least 4 songs.";
    case "too_many_songs":
      return "An event can have at most 30 songs.";
    case "duplicate_songs":
      return "Two of your songs have the same title. Remove one of them.";
    case "songs_unavailable":
      return "Some songs are no longer available. Remove them and try again.";
    case "already_answered":
      return "You already answered this round.";
    case "round_over":
      return "Too late, the round is over.";
    default:
      return "Something went wrong. Please try again.";
  }
}
