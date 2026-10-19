// Game sound effects, synthesized with WebAudio (no files to load or license). Browser only.
// Call unlockSfx() from a tap first: browsers keep audio silent until the user interacts.

let ctx: AudioContext | null = null;
let muted = false;

export function unlockSfx() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

export const setSfxMuted = (value: boolean) => {
  muted = value;
};

/** One short tone: frequency in Hz, start offset and length in seconds. */
function tone(freq: number, at = 0, length = 0.12, type: OscillatorType = "sine", volume = 0.18) {
  if (!ctx || muted) return;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export const sfx = {
  /** Rising two-note chime; climbs higher the longer the combo. */
  correct(combo = 1) {
    const lift = Math.pow(2, Math.min(combo - 1, 6) / 12);
    tone(660 * lift, 0, 0.12, "triangle");
    tone(990 * lift, 0.08, 0.22, "triangle");
    if (combo >= 3) tone(1320 * lift, 0.16, 0.25, "sine", 0.12);
  },
  wrong() {
    tone(196, 0, 0.18, "sawtooth", 0.08);
    tone(147, 0.12, 0.28, "sawtooth", 0.08);
  },
  /** Clock tick for the last seconds of a round. */
  tick() {
    tone(1200, 0, 0.04, "square", 0.05);
  },
  /** Countdown beep before a round; `go` is the higher final one. */
  count(go = false) {
    tone(go ? 880 : 440, 0, go ? 0.25 : 0.1, "triangle", 0.14);
  },
  /** Results fanfare, bigger with more stars. */
  fanfare(stars: number) {
    const notes = [523, 659, 784, 1047].slice(0, Math.max(2, stars + 1));
    notes.forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle", 0.15));
  },
};
