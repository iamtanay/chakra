/*
  # Add display_name to project_members

  Stores a privacy-safe display label for each member so the ShareModal
  can show a human-readable name without querying auth.users (which would
  require exposing emails or full user records to other users).

  The owner's client writes this field at insert time using the name/email
  returned by the lookup-user Edge Function. Because the value is set by
  the project owner (who already knows the email they typed), no additional
  information is exposed to other users.

  RLS note:
  - Members can only SELECT their own row (user_id = auth.uid()).
  - Owners can SELECT all rows for their projects (is_project_owner check).
  - Only the owner can INSERT / UPDATE / DELETE, enforced by existing policies.
  So display_name is only visible to the owner of the project — the invited
  user themselves can also see their own row, but only their own name.
*/

ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';

-- Backfill existing rows.
-- Prefer the user's chosen display_name from auth metadata; fall back to
-- the local-part of their email (everything before the @).
-- This runs as postgres (migration context) so it can read auth.users freely.
UPDATE project_members pm
SET display_name = (
  SELECT
    CASE
      WHEN u.raw_user_meta_data->>'display_name' IS NOT NULL
       AND trim(u.raw_user_meta_data->>'display_name') <> ''
      THEN trim(u.raw_user_meta_data->>'display_name')
      ELSE split_part(u.email, '@', 1)
    END
  FROM auth.users u
  WHERE u.id = pm.user_id
)
WHERE pm.display_name = '';
