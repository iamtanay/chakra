-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add task_occurrences table for recurring task history
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists task_occurrences (
  id               uuid primary key default gen_random_uuid(),
  task_id          uuid not null references tasks(id) on delete cascade,
  due_date         date not null,
  status           text not null default 'Done',
  actual_hours     numeric(6,2),
  completion_note  text,
  completed_at     timestamptz not null default now(),
  completed_by     uuid references auth.users(id),
  created_at       timestamptz not null default now(),

  -- One occurrence record per cycle per task
  unique (task_id, due_date)
);

-- Fast lookups for Daily Pulse (hours today) and Analytics (range queries)
create index on task_occurrences (completed_by, completed_at);
create index on task_occurrences (task_id);
create index on task_occurrences (task_id, due_date);

-- RLS: users can only read/write their own occurrences
alter table task_occurrences enable row level security;

create policy "Users can insert own occurrences"
  on task_occurrences for insert
  with check (completed_by = auth.uid());

create policy "Users can read occurrences in their projects"
  on task_occurrences for select
  using (
    task_id in (
      select t.id from tasks t
      join projects p on p.id = t.project_id
      where p.owner_id = auth.uid()
         or t.project_id in (
           select project_id from project_members where user_id = auth.uid()
         )
    )
  );
