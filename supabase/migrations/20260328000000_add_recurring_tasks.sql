/*
  # Add recurring task support to the tasks table

  ## New columns

  | Column                  | Type      | Purpose                                                        |
  |-------------------------|-----------|----------------------------------------------------------------|
  | is_recurring            | boolean   | Distinguishes recurring templates from one-off tasks           |
  | recurrence_frequency    | text      | daily / weekly / monthly / annual                             |
  | recurrence_day_of_week  | smallint  | 0–6 (Sun=0). Used for weekly tasks                            |
  | recurrence_day_of_month | smallint  | 1–31. Used for monthly tasks                                  |
  | recurrence_month        | smallint  | 1–12. Used for annual tasks (combined with day_of_month)      |
  | last_completed_cycle    | date      | Calendar date of the cycle that was last marked complete      |
  | next_due_date           | date      | The current/upcoming cycle's due date (computed & stored)     |

  ## Migration safety for pre-existing rows
  - All new columns have safe NOT NULL defaults or are nullable
  - Existing rows get is_recurring = false, all recurrence columns NULL
  - next_due_date for existing rows = their existing due_date (no behaviour change)
  - last_completed_cycle for existing rows:
      if status = 'Done' and completed_at is set → use completed_at::date
      otherwise → NULL
  - The existing `due_date` column is untouched; for recurring tasks it
    holds the recurrence start date; for one-off tasks it continues as before.
*/

-- 1. Add columns with safe defaults -----------------------------------------

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_recurring            boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_frequency    text        CHECK (recurrence_frequency IN ('daily','weekly','monthly','annual')),
  ADD COLUMN IF NOT EXISTS recurrence_day_of_week  smallint    CHECK (recurrence_day_of_week BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS recurrence_day_of_month smallint    CHECK (recurrence_day_of_month BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS recurrence_month        smallint    CHECK (recurrence_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS last_completed_cycle    date,
  ADD COLUMN IF NOT EXISTS next_due_date           date;

-- 2. Back-fill last_completed_cycle for existing Done tasks ------------------
--    Only set it when we have a concrete completed_at timestamp.

UPDATE tasks
SET    last_completed_cycle = completed_at::date
WHERE  is_recurring = false
  AND  status       = 'Done'
  AND  completed_at IS NOT NULL;

-- 3. Back-fill next_due_date for existing one-off tasks ----------------------
--    Keeps the board display logic uniform: one-off tasks use next_due_date
--    as an alias for due_date so components need only look at one column.
--    For tasks that are Done we leave next_due_date NULL (no upcoming date).

UPDATE tasks
SET    next_due_date = due_date
WHERE  is_recurring = false
  AND  status      != 'Done'
  AND  due_date    IS NOT NULL;

-- 4. Constraint: recurrence columns must be set when is_recurring = true -----

ALTER TABLE tasks
  ADD CONSTRAINT recurring_requires_frequency
    CHECK (
      (is_recurring = false)
      OR
      (is_recurring = true AND recurrence_frequency IS NOT NULL)
    );

-- 5. Index for efficient board queries ---------------------------------------
--    The board filters by next_due_date to decide visibility.

CREATE INDEX IF NOT EXISTS tasks_next_due_date_idx     ON tasks (next_due_date);
CREATE INDEX IF NOT EXISTS tasks_is_recurring_idx      ON tasks (is_recurring);
CREATE INDEX IF NOT EXISTS tasks_last_completed_cycle_idx ON tasks (last_completed_cycle);
