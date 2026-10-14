// Event view types shared with the browser (no server imports here).
import type { PublicOption, RevealTrack } from "../types";

/** Supabase Realtime channel that pings every screen of an event. */
export const eventTopic = (code: string) => `earrush-event-${code}`;

export type EventMode = "screen" | "phones";
export type EventPhase = "lobby" | "countdown" | "question" | "reveal" | "finished";

export type StandingRow = { rank: number; handle: string; score: number; isYou: boolean };

export type EventView = {
  code: string;
  mode: EventMode;
  role: "host" | "player" | "visitor";
  hostHandle: string;
  phase: EventPhase;
  serverNow: number;
  roundIndex: number;
  totalRounds: number;
  startsAt: number | null;
  /** When the round closes for answers (the reveal can come earlier if everyone answered). */
  deadline: number | null;
  roundMs: number;
  playerCount: number;
  standings: StandingRow[];
  /** Clip URLs for this viewer, if their device plays the music (next = preload). */
  audio: { current: string | null; next: string | null };
  round: null | {
    options: PublicOption[];
    answered: number;
    reveal: null | { correctOptionId: string; track: RevealTrack; counts: Record<string, number> };
  };
  you: null | {
    handle: string;
    score: number;
    rank: number;
    /** correct/points stay null until the reveal, so nobody's reaction gives the answer away. */
    answer: null | { optionId: string | null; correct: boolean | null; points: number | null };
  };
};
