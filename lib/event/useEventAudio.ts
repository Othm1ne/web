"use client";
// Plays an event's clips on the device that has the music (the big screen, or each phone).
// Clips are preloaded as blobs and started at the server's round start time, so several
// phones in one room stay roughly in sync.
import { useCallback, useEffect, useRef, useState } from "react";
import type { EventView } from "./types";

/** 0.1 s of silence, played from a tap to unlock audio (iOS only allows sound started by a gesture). */
function silentWav(): string {
  const samples = 800;
  const buf = new DataView(new ArrayBuffer(44 + samples));
  const text = (at: number, s: string) => [...s].forEach((c, i) => buf.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  buf.setUint32(4, 36 + samples, true);
  text(8, "WAVEfmt ");
  buf.setUint32(16, 16, true);
  buf.setUint16(20, 1, true); // PCM
  buf.setUint16(22, 1, true); // mono
  buf.setUint32(24, 8000, true);
  buf.setUint32(28, 8000, true);
  buf.setUint16(32, 1, true);
  buf.setUint16(34, 8, true);
  text(36, "data");
  buf.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) buf.setUint8(44 + i, 128);
  return `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(buf.buffer)))}`;
}

export function useEventAudio(view: EventView | null, serverNow: () => number) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const clips = useRef(new Map<string, Promise<string>>());
  const playing = useRef<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audio.current = el;
    const cache = clips.current;
    return () => {
      el.pause();
      cache.forEach((p) => p.then(URL.revokeObjectURL, () => {}));
    };
  }, []);

  const load = useCallback((url: string) => {
    let clip = clips.current.get(url);
    if (!clip) {
      clip = fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error("clip failed");
          return r.blob();
        })
        .then((b) => URL.createObjectURL(b));
      clip.catch(() => clips.current.delete(url)); // allow a retry on the next render
      clips.current.set(url, clip);
    }
    return clip;
  }, []);

  const current = view?.audio.current ?? null;
  const next = view?.audio.next ?? null;
  useEffect(() => {
    if (current) load(current).catch(() => {});
    if (next) load(next).catch(() => {});
  }, [current, next, load]);

  /** Call from a tap. */
  const unlock = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    el.src = silentWav();
    playing.current = null;
    el.play()
      .then(() => setUnlocked(true))
      .catch(() => {});
  }, []);

  const phase = view?.phase;
  const startsAt = view?.startsAt ?? null;
  const clipStart = view?.audio.startSec ?? 0;
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    if (phase === "lobby" || phase === "finished" || !current || startsAt === null) {
      el.pause();
      return;
    }
    // Keep a clip playing through its reveal, but don't start one that was missed.
    if (phase === "reveal" || playing.current === current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    load(current)
      .then((src) => {
        if (cancelled) return;
        // Load it during the countdown (this cuts the previous round's clip) so the start is instant.
        if (el.getAttribute("src") !== src) el.src = src;
        const begin = () => {
          playing.current = current;
          // From the host's chosen point; joining late (or a slow download) starts further in,
          // in step with everyone else.
          el.currentTime = clipStart + Math.max(0, (serverNow() - startsAt) / 1000);
          el.play().catch(() => {
            playing.current = null;
          });
        };
        timer = setTimeout(begin, Math.max(0, startsAt - serverNow()));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, current, startsAt, clipStart, unlocked, load, serverNow]);

  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
  }, [muted]);

  return { unlocked, unlock, muted, toggleMute: () => setMuted((m) => !m) };
}
