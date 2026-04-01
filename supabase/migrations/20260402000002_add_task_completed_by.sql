/*
  # Add completed_by to tasks

  Tracks which user marked a task as Done, so the Reports page can show
  each user only their own completions — not tasks finished by teammates
  in shared projects.

  Changes:
  1. Add completed_by uuid column (nullable, references auth.users)
  2. Backfill existing Done tasks:
     - If the task's project has an owner, attribute it to the owner
       (best-effort for historical data created before multi-user support)
     - Remaining rows (edge cases) are left NULL and will be excluded from
       per-user reports, which is the safe default
  3. No RLS change needed — tasks already follow project-level RLS, and
     completed_by is just a data column read by the reports query
*/

-- ── 1. Add the column ────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Backfill existing Done tasks ─────────────────────────────────────────
-- Attribute them to the project owner. For projects shared before this
-- migration, this is the best approximation we can make.

UPDATE tasks t
SET completed_by = p.owner_id
FROM projects p
WHERE t.project_id  = p.id
  AND t.status      = 'Done'
  AND t.completed_by IS NULL;
