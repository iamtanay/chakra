-- ═══════════════════════════════════════════════════════════════════════════
-- STREAMS — consolidated migration
-- Covers: tables, triggers, SECURITY DEFINER helpers, RLS policies
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists streams (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  color      text        not null default '#e8a247',
  type       text        not null default 'mixed'
               check (type in ('checklist', 'notes', 'links', 'mixed')),
  owner_id   uuid        not null references auth.users(id) on delete cascade,
  archived   boolean     not null default false,
  pinned     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stream_members (
  stream_id    uuid        not null references streams(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  role         text        not null default 'editor' check (role in ('viewer', 'editor')),
  display_name text        not null default '',
  shared_at    timestamptz not null default now(),
  primary key (stream_id, user_id)
);

create table if not exists stream_sections (
  id         uuid        primary key default gen_random_uuid(),
  stream_id  uuid        not null references streams(id) on delete cascade,
  title      text        not null,
  position   integer     not null default 0,
  collapsed  boolean     not null default false,
  created_at timestamptz not null default now()
);

create table if not exists stream_items (
  id             uuid        primary key default gen_random_uuid(),
  stream_id      uuid        not null references streams(id) on delete cascade,
  section_id     uuid        references stream_sections(id) on delete set null,
  content        text        not null default '',
  type           text        not null default 'check'
                   check (type in ('check', 'note', 'link')),
  checked        boolean     not null default false,
  position       integer     not null default 0,
  link_url       text,
  link_title     text,
  link_favicon   text,
  linked_task_id uuid        references tasks(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);


-- ── Triggers ──────────────────────────────────────────────────────────────

-- Keep updated_at current on streams and stream_items
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger streams_updated_at
  before update on streams
  for each row execute procedure touch_updated_at();

create trigger stream_items_updated_at
  before update on stream_items
  for each row execute procedure touch_updated_at();

-- Bump streams.updated_at whenever a child item changes
create or replace function bump_stream_updated_at()
returns trigger language plpgsql as $$
begin
  update streams
  set updated_at = now()
  where id = coalesce(new.stream_id, old.stream_id);
  return null;
end;
$$;

create trigger stream_items_bump_parent
  after insert or update or delete on stream_items
  for each row execute procedure bump_stream_updated_at();


-- ── RLS — enable ─────────────────────────────────────────────────────────

alter table streams         enable row level security;
alter table stream_members  enable row level security;
alter table stream_sections enable row level security;
alter table stream_items    enable row level security;


-- ── SECURITY DEFINER helpers ──────────────────────────────────────────────
-- Run as postgres to avoid RLS recursion when policies need to check
-- streams/stream_members from within those same tables' policies.

create or replace function is_stream_owner(p_stream_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from streams
    where id = p_stream_id and owner_id = auth.uid()
  );
$$;

create or replace function is_stream_member(p_stream_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from stream_members
    where stream_id = p_stream_id and user_id = auth.uid()
  );
$$;

create or replace function can_edit_stream(p_stream_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from streams
    where id = p_stream_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from stream_members
    where stream_id = p_stream_id
      and user_id = auth.uid()
      and role = 'editor'
  );
$$;


-- ── RLS — policies ────────────────────────────────────────────────────────

-- streams
create policy "streams_select" on streams for select
  using (owner_id = auth.uid() or is_stream_member(id));

create policy "streams_insert" on streams for insert
  with check (owner_id = auth.uid());

create policy "streams_update" on streams for update
  using (can_edit_stream(id))
  with check (can_edit_stream(id));

create policy "streams_delete" on streams for delete
  using (owner_id = auth.uid());

-- stream_members
create policy "stream_members_select" on stream_members for select
  using (user_id = auth.uid() or is_stream_owner(stream_id));

create policy "stream_members_insert" on stream_members for insert
  with check (is_stream_owner(stream_id));

create policy "stream_members_delete" on stream_members for delete
  using (is_stream_owner(stream_id));

-- stream_sections
create policy "stream_sections_select" on stream_sections for select
  using (is_stream_owner(stream_id) or is_stream_member(stream_id));

create policy "stream_sections_insert" on stream_sections for insert
  with check (can_edit_stream(stream_id));

create policy "stream_sections_update" on stream_sections for update
  using (can_edit_stream(stream_id))
  with check (can_edit_stream(stream_id));

create policy "stream_sections_delete" on stream_sections for delete
  using (can_edit_stream(stream_id));

-- stream_items
create policy "stream_items_select" on stream_items for select
  using (is_stream_owner(stream_id) or is_stream_member(stream_id));

create policy "stream_items_insert" on stream_items for insert
  with check (can_edit_stream(stream_id));

create policy "stream_items_update" on stream_items for update
  using (can_edit_stream(stream_id))
  with check (can_edit_stream(stream_id));

create policy "stream_items_delete" on stream_items for delete
  using (can_edit_stream(stream_id));