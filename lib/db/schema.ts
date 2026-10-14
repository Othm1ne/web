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
  // Supabase exposes the public schema through its Data API using a public key. RLS with no
  // policies denies that API everything; the app's direct connection (table owner) bypasses RLS.
  `alter table users enable row level security`,
  `alter table games enable row level security`,
  // Live events (host-picked songs, players join with a code).
  `create table if not exists events (
    id uuid primary key,
    code text not null unique,
    host_id uuid not null references users(id) on delete cascade,
    mode text not null,
    status text not null default 'lobby',
    current_round integer not null default -1,
    round_starts_at timestamptz,
    data jsonb not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists event_players (
    event_id uuid not null references events(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    handle text not null,
    joined_at timestamptz not null default now(),
    primary key (event_id, user_id)
  )`,
  `create table if not exists event_answers (
    event_id uuid not null,
    round integer not null,
    user_id uuid not null,
    option_id text,
    elapsed_ms integer not null,
    correct boolean not null,
    points integer not null,
    primary key (event_id, round, user_id),
    foreign key (event_id, user_id) references event_players (event_id, user_id) on delete cascade
  )`,
  `alter table events enable row level security`,
  `alter table event_players enable row level security`,
  `alter table event_answers enable row level security`,
];
