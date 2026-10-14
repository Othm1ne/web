// Live-update pings over Supabase Realtime broadcast. A ping only says "event X changed";
// screens then re-read the authoritative state from our API, so a forged ping is harmless.
// Without Supabase configured, screens fall back to polling.
import { eventTopic } from "./event/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function notifyEvent(code: string) {
  if (!SUPABASE_URL || !KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: eventTopic(code), event: "changed", payload: { at: Date.now() }, private: false }] }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) console.error("realtime notify failed", res.status);
  } catch (err) {
    console.error("realtime notify failed", err);
  }
}
