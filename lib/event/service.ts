// Server glue for live events: load an event with its players and answers, plus access checks.
import { getDb } from "../db";
import { loadAnswers, loadEvent, loadPlayers } from "../db/events";
import { GameError } from "../game/engine";
import type { User } from "../types";
import { EVENT_TTL_MS, phaseOf } from "./engine";
import { eventView } from "./view";

export function parseCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new GameError("event_not_found", 404);
  return code;
}

export async function loadState(rawCode: string, viewerId: string | null, now = Date.now()) {
  const db = await getDb();
  const event = await loadEvent(db, parseCode(rawCode));
  if (!event) throw new GameError("event_not_found", 404);
  const [players, answers] = await Promise.all([
    loadPlayers(db, event.id, event.currentRound),
    loadAnswers(db, event.id, event.currentRound),
  ]);
  const phase = phaseOf(event, answers.length, players.length, now);
  return { db, event, players, answers, phase, view: eventView(event, players, answers, viewerId, now) };
}

export const isExpired = (createdAt: number, now = Date.now()) => now - createdAt > EVENT_TTL_MS;

export function requireHost(user: User) {
  if (user.provider !== "google") throw new GameError("host_needs_google", 403);
}
