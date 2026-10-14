"use client";
// Keeps one screen in sync with a live event: Supabase Realtime pings trigger a refetch, a
// refetch is also scheduled for each time-based change (round start, deadline), and polling
// covers dropped connections. All state comes from our API; pings carry no data.
import { RealtimeClient } from "@supabase/realtime-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../client";
import { type EventView, eventTopic } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const POLL_CONNECTED_MS = 8_000;
const POLL_FALLBACK_MS = 1_500;

export function useLiveEvent(code: string) {
  const [view, setView] = useState<EventView | null>(null);
  const [error, setError] = useState("");
  const offset = useRef(0);
  const latest = useRef(0);

  /** Applies a response, ignoring ones that arrive after a newer one. */
  const apply = useCallback((v: EventView, sentAt: number) => {
    if (sentAt < latest.current) return;
    latest.current = sentAt;
    offset.current = v.serverNow - (sentAt + Date.now()) / 2;
    setView(v);
  }, []);

  const refresh = useCallback(async () => {
    const sentAt = Date.now();
    try {
      const res = await fetch(`/api/events/${code}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      apply(data, sentAt);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code, apply]);

  const act = useCallback(
    async (path: string, body?: unknown) => {
      const sentAt = Date.now();
      const res = await fetch(`/api/events/${code}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(errorMessage(data.error));
      apply(data, sentAt);
    },
    [code, apply],
  );

  // Realtime pings plus a polling safety net.
  useEffect(() => {
    let connected = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    let pingTimer: ReturnType<typeof setTimeout> | undefined;
    const poll = () => {
      refresh();
      pollTimer = setTimeout(poll, connected ? POLL_CONNECTED_MS : POLL_FALLBACK_MS);
    };
    poll();

    if (!SUPABASE_URL || !SUPABASE_KEY) return () => clearTimeout(pollTimer);
    const client = new RealtimeClient(`${SUPABASE_URL}/realtime/v1`, { params: { apikey: SUPABASE_KEY } });
    const channel = client
      .channel(eventTopic(code))
      .on("broadcast", { event: "changed" }, () => {
        // Collapse bursts (e.g. many answers at once) into one refetch.
        clearTimeout(pingTimer);
        pingTimer = setTimeout(refresh, 120);
      })
      .subscribe((status) => {
        connected = status === "SUBSCRIBED";
      });
    return () => {
      clearTimeout(pollTimer);
      clearTimeout(pingTimer);
      client.removeChannel(channel);
      client.disconnect();
    };
  }, [code, refresh]);

  // Time-based transitions don't send pings, so refetch right after each one.
  const startsAt = view?.startsAt ?? null;
  const deadline = view?.deadline ?? null;
  useEffect(() => {
    const now = Date.now() + offset.current;
    const timers = [startsAt, deadline]
      .filter((t): t is number => t !== null && t > now)
      .map((t) => setTimeout(refresh, t - now + 60));
    return () => timers.forEach(clearTimeout);
  }, [startsAt, deadline, refresh]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return {
    view,
    error,
    serverNow,
    join: (handle?: string) => act("join", handle ? { handle } : {}),
    next: () => act("next"),
    answer: (round: number, optionId: string) => act("answer", { round, optionId }),
  };
}

/** Re-renders every `ms` while active (for countdowns and timers). */
export function useTicker(active: boolean, ms = 100) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}
