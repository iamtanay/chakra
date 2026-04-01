/*
  # Fix project_members SELECT policy

  The previous members_select policy only allowed users to see their own row
  (user_id = auth.uid()), which meant project owners couldn't see the members
  they had added — resulting in "People with access · 0" in the ShareModal.

  Fix: owners can see all member rows for their projects using the existing
  is_project_owner() SECURITY DEFINER function (no recursion risk).
*/

DROP POLICY IF EXISTS "members_select" ON project_members;

CREATE POLICY "members_select"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    -- Members can see their own row
    user_id = auth.uid()
    OR
    -- Owners can see all members of their projects
    is_project_owner(project_id)
  );
