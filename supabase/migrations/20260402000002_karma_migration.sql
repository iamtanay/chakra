-- ── Karma: daily rituals & logs ──────────────────────────────────────────────

-- Table 1: ritual definitions per user
create table if not exists karma_rituals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  emoji      text not null default '✦',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

alter table karma_rituals enable row level security;

create policy "Users manage own rituals"
  on karma_rituals for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Table 2: one row per (user, ritual, date) when completed
create table if not exists karma_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  ritual_id  uuid not null references karma_rituals(id) on delete cascade,
  log_date   date not null default current_date,
  created_at timestamptz not null default now(),
  unique (ritual_id, log_date)
);

alter table karma_logs enable row level security;

create policy "Users manage own karma logs"
  on karma_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for fast date-range queries
create index if not exists karma_logs_user_date on karma_logs(user_id, log_date desc);
create index if not exists karma_rituals_user_pos on karma_rituals(user_id, position);
