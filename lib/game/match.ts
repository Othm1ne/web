// Title normalization and fuzzy matching. Used to dedupe near-identical tracks
// (e.g. remasters) and, later, to grade free-text answers.

const BRACKETED_NOISE =
  /\s*[([][^)\]]*\b(feat|ft|with|version|remaster(ed)?|live|edit|mix|mono|stereo|deluxe|bonus|from|acoustic|demo)\b[^)\]]*[)\]]/g;
const DASH_SUFFIX_NOISE = /\s+-\s+.*\b(remaster(ed)?|version|live|edit|mix|mono|acoustic|demo)\b.*$/;

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(BRACKETED_NOISE, " ")
    .replace(DASH_SUFFIX_NOISE, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len;
}

/** True when a typed guess should count as the given title. */
export function isTitleMatch(guess: string, title: string): boolean {
  const g = normalizeTitle(guess);
  const t = normalizeTitle(title);
  if (!g || !t) return false;
  if (g === t || similarity(g, t) >= 0.85) return true;
  const guessTokens = new Set(g.split(" "));
  return t.split(" ").every((tok) => guessTokens.has(tok));
}
