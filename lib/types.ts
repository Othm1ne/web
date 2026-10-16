export type ArtistSummary = { id: string; name: string; genre: string; image: string };

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  previewUrl: string;
  /** Catalog id of the main artist, when known (used to find similar wrong options). */
  artistId?: string;
};

export type PublicOption = { id: string; title: string; cover: string };

/** A song as shown to event hosts (no preview URL). */
export type TrackSummary = Omit<Track, "previewUrl">;

/** A song as shown to event hosts, with its preview so they can choose the clip. */
export type HostTrack = TrackSummary & { previewUrl: string };

export type PublicRound = {
  index: number;
  audioUrl: string;
  options: PublicOption[];
  answered: boolean;
};

export type PublicGame = {
  id: string;
  handle: string;
  artist: ArtistSummary;
  roundMs: number;
  rounds: PublicRound[];
  finished: boolean;
};

export type RevealTrack = Pick<Track, "title" | "artist" | "album" | "cover">;

export type RevealResult = {
  correct: boolean;
  correctOptionId: string;
  track: RevealTrack;
  points: number;
  elapsedMs: number;
  total: number;
  finished: boolean;
};

export type Player = { id: string; handle: string; country: string | null };

export type User = Player & { provider: "guest" | "google" };

export type LeaderboardRow = { rank: number; handle: string; score: number; country: string | null; isYou: boolean };

export type GameSummary = {
  id: string;
  handle: string;
  artist: ArtistSummary;
  score: number;
  correctCount: number;
  totalRounds: number;
  avgMs: number;
  rank: number;
  players: number;
  top: LeaderboardRow[];
  rounds: (RevealTrack & { correct: boolean; points: number; elapsedMs: number })[];
};
