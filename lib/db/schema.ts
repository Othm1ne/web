// Idempotent schema, applied on first connection. Add new statements at the end;
// never edit an existing one once deployed.
export const SCHEMA = [
  `create table if not exists users (
    id uuid primary key,
    handle text not null,
    provider text not null default 'guest',
    google_sub text unique,
    email text,
    country text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists games (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    mode text not null default 'artist',
    artist_id text not null,
    artist_name text not null,
    score integer not null,
    correct_count integer not null,
    avg_ms integer not null,
    started_at timestamptz not null,
    finished_at timestamptz not null
  )`,
  `create index if not exists games_artist_score on games (artist_id, score desc)`,
  `create index if not exists games_user on games (user_id)`,
];
