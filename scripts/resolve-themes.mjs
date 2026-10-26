// Looks up every song in lib/music/themeSongs.ts on iTunes and records its track id in
// lib/music/themeTracks.json ("Artist|Title" → id, or null when nothing matched). Songs already
// in the file are skipped, so re-runs only cost calls for new songs; `--retry` retries the misses.
//   node --experimental-strip-types scripts/resolve-themes.mjs [--retry] [theme-slug…]
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "lib/music/themeTracks.json");
const COUNTRY = process.env.MUSIC_COUNTRY ?? "US";
// iTunes allows roughly 20 calls a minute.
const GAP_MS = 3100;

const { THEME_SONGS } = await import(pathToFileURL(path.join(root, "lib/music/themeSongs.ts")).href);
const args = process.argv.slice(2);
const retry = args.includes("--retry");
const only = args.filter((a) => !a.startsWith("--"));

const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9؀-ۿ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
// Title without bracketed or dashed extras: "Blue (Da Ba Dee)" → "blue", "Song - 2011 Remaster" → "song".
const core = (s) => fold(s.replace(/\s*[([].*?[)\]]/g, " ").replace(/\s+-\s+.*$/, ""));
const VERSION = /\b(live|acoustic|remix|mix|edit|version|radio|club|dub|rework|bootleg|mashup|instrumental|demo|unplugged|session|sped up|slowed|re ?recorded|taylor s version)\b/;
const FAKE = /\b(karaoke|tribute|cover|in the style of|made famous|originally performed|backing track|lullaby|piano version|8 bit|workout)\b/;

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const similar = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

/** Lower is better; null when the result isn't this song. */
function score(item, artist, title) {
  if (item.kind !== "song" || !item.previewUrl || !item.trackName) return null;
  const name = fold(item.artistName ?? "");
  const extras = fold(`${item.trackName} ${item.collectionName ?? ""}`);
  if (FAKE.test(extras) && !FAKE.test(fold(title))) return null;
  // Any of the credited artists may be how iTunes lists it ("Lady Gaga & Bradley Cooper").
  const artists = fold(artist).split(/ and | feat | x /).map((a) => a.trim()).filter(Boolean);
  if (!artists.some((a) => name.includes(a) || a.includes(name) || similar(a, name) >= 0.8)) return null;
  const want = core(title) || fold(title);
  const got = core(item.trackName) || fold(item.trackName);
  let s =
    got === want ? 0
    : fold(item.trackName) === fold(title) ? 0
    : got.startsWith(want) || want.startsWith(got) ? 1
    : similar(got, want) >= 0.8 ? 2
    : null;
  if (s === null) return null;
  if (VERSION.test(fold(item.trackName)) && !VERSION.test(fold(title))) s += 2;
  if (/\b(live|karaoke|sing along)\b/.test(fold(item.collectionName ?? ""))) s += 1;
  return s;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function search(term) {
  const url = new URL("https://itunes.apple.com/search");
  for (const [k, v] of Object.entries({ term, entity: "song", limit: "25", country: COUNTRY })) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    await wait(Math.max(0, last + GAP_MS - Date.now()));
    last = Date.now();
    const res = await fetch(url);
    if (res.ok) return (await res.json()).results ?? [];
    if ((res.status === 403 || res.status === 429) && attempt < 5) {
      console.warn(`  rate limited, waiting a minute…`);
      await wait(60_000);
      continue;
    }
    throw new Error(`iTunes ${res.status} for "${term}"`);
  }
}

function best(items, artist, title) {
  let pick = null;
  for (const it of items) {
    const s = score(it, artist, title);
    if (s !== null && (!pick || s < pick.s)) pick = { s, it };
  }
  return pick?.it ?? null;
}

async function resolve(song) {
  const [artist, title] = song.split("|");
  const plain = (s) => s.replace(/\s*[([].*?[)\]]/g, "").trim();
  let hit = best(await search(`${plain(artist)} ${plain(title)}`), artist, title);
  // Long combined terms sometimes miss; the title alone, filtered by artist, often finds it.
  if (!hit) hit = best(await search(plain(title)), artist, title);
  return hit;
}

const known = JSON.parse(await readFile(OUT, "utf8").catch(() => "{}"));
const misses = [];
for (const [slug, songs] of Object.entries(THEME_SONGS)) {
  if (only.length && !only.includes(slug)) continue;
  const todo = songs.filter((s) => !(s in known) || (retry && known[s] === null));
  console.log(`${slug}: ${songs.length} songs, ${todo.length} to look up`);
  for (const song of todo) {
    try {
      const hit = await resolve(song);
      known[song] = hit ? String(hit.trackId) : null;
      console.log(hit ? `  ✓ ${song} → ${hit.artistName} — ${hit.trackName}` : `  ✗ ${song}`);
    } catch (e) {
      console.warn(`  ! ${song}: ${e.message}`);
    }
  }
  await writeFile(OUT, JSON.stringify(Object.fromEntries(Object.entries(known).sort()), null, 1) + "\n");
  for (const s of songs) if (known[s] === null) misses.push(`${slug}: ${s}`);
}
console.log(misses.length ? `\nNot found (${misses.length}):\n${misses.join("\n")}` : "\nEvery song resolved.");
