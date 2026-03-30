/*
  # Add Momentum (streak) and Traces (completion_note) columns to tasks

  1. Changes to `tasks`
     - `current_streak`   (integer, default 0)
       Tracks how many consecutive recurring cycles have been completed on time.
       Incremented on each on-time cycle completion; reset to 0 on a missed/overdue cycle.
       Non-recurring tasks always stay at 0 — the column is ignored for them.

     - `completion_note`  (text, optional, max 200 chars enforced in app layer)
       A freeform one-line note the user optionally adds when completing a task.
       "How did it go?" — outcome context, not task description.
       Persists on one-off tasks permanently.
       Reset to NULL each time a recurring task's cycle is advanced.

  2. No RLS changes needed — existing "Authenticated full access on tasks"
     policy already covers these new columns.

  3. Indexes
     - No index needed on completion_note (not queried, only displayed).
     - No index needed on current_streak (small table, full scan is fine).
*/

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS current_streak  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_note text;

-- Constraint: streak cannot be negative
ALTER TABLE tasks
  ADD CONSTRAINT tasks_current_streak_non_negative CHECK (current_streak >= 0);
