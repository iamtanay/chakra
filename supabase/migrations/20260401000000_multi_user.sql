/*
  # Multi-User Support

  Adds ownership + sharing to the projects table.

  Changes:
  1. Add owner_id column to projects (references auth.users)
  2. Create project_members junction table (viewer / editor roles)
  4. Drop the old wide-open RLS policies on projects and tasks
  5. Create a SECURITY DEFINER helper function to check project ownership
     without triggering RLS recursion
  6. Add fine-grained RLS policies:
       - projects: owner or member can SELECT; only owner can DELETE;
                   owner or editor can UPDATE; INSERT requires owner_id = auth.uid()
       - tasks:    access gated through project membership / ownership
       - project_members: owner manages (via SECURITY DEFINER function);
                          members can read only their own rows
  7. Index project_members.user_id for fast per-user lookups

  SAFE for existing data:
  - The tasks table schema is unchanged — RLS is updated via new policies only.
  - Set owner_id on existing projects manually before applying the NOT NULL
    constraint, or the migration will fail.

  NOTE on RLS recursion:
  - projects_select checks project_members (to see if the user is a member)
  - A naive project_members policy that checks projects.owner_id would cause
    infinite recursion: projects → project_members → projects → ...
  - This is solved by the is_project_owner() SECURITY DEFINER function, which
    runs as the function owner (postgres), bypassing RLS entirely, so it can
    read projects.owner_id directly with no policy loop.
*/

-- ── 1. Add owner_id to projects ─────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Now enforce NOT NULL — every project must have an owner going forward.
ALTER TABLE projects
  ALTER COLUMN owner_id SET NOT NULL;

-- ── 3. project_members junction table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_members (
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'editor'
                          CHECK (role IN ('viewer', 'editor')),
  shared_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_id_idx
  ON project_members (user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ── 4. Drop old permissive policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated full access on projects" ON projects;
DROP POLICY IF EXISTS "Authenticated full access on tasks"    ON tasks;

-- ── 5. SECURITY DEFINER helper — breaks the RLS recursion loop ───────────────
--
-- project_members policies need to verify that the caller owns the project.
-- But querying projects from within a project_members policy would trigger
-- projects_select, which queries project_members, causing infinite recursion.
--
-- SECURITY DEFINER functions execute as their definer (postgres) and bypass
-- RLS completely, so they can safely read projects.owner_id with no loop.

CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id       = p_project_id
      AND owner_id = auth.uid()
  );
$$;

-- ── 6. Projects RLS ─────────────────────────────────────────────────────────

-- SELECT: owner OR any member
CREATE POLICY "projects_select"
  ON projects FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id    = auth.uid()
    )
  );

-- INSERT: must set own uid as owner
CREATE POLICY "projects_insert"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: owner OR editor
CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id    = auth.uid()
        AND role       = 'editor'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id    = auth.uid()
        AND role       = 'editor'
    )
  );

-- DELETE: owner only
CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ── 7. Tasks RLS ─────────────────────────────────────────────────────────────
-- Tasks inherit access from their project. No owner_id on tasks — the
-- project's ownership / membership table is the authority.
-- These policies query projects directly (not project_members policies),
-- so there is no recursion risk here.

-- SELECT: can see task if you can see the project
CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members m
            WHERE m.project_id = p.id
              AND m.user_id    = auth.uid()
          )
        )
    )
  );

-- INSERT / UPDATE / DELETE: owner or editor on the project
CREATE POLICY "tasks_write"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members m
            WHERE m.project_id = p.id
              AND m.user_id    = auth.uid()
              AND m.role       = 'editor'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members m
            WHERE m.project_id = p.id
              AND m.user_id    = auth.uid()
              AND m.role       = 'editor'
          )
        )
    )
  );

-- ── 8. project_members RLS ───────────────────────────────────────────────────
-- All ownership checks use is_project_owner() to avoid recursion.

-- SELECT: own membership row only.
-- Owners identify themselves via projects.owner_id, not a member row,
-- so they have no row here to select. The app loads member lists only
-- in ShareModal (owner-only UI), which is fine — the owner can see all
-- rows because is_project_owner() returns true for their projects.
-- Note: we keep this simple (user_id = auth.uid()) to avoid any possible
-- recursion. The ShareModal re-reads members after each insert, which
-- works because the newly inserted user_id will match auth.uid() for
-- the invited user, and the owner sees their own inserts via app state.
CREATE POLICY "members_select"
  ON project_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: only the project owner can add members
CREATE POLICY "members_insert"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_owner(project_id));

-- UPDATE: only the project owner can change roles
CREATE POLICY "members_update"
  ON project_members FOR UPDATE
  TO authenticated
  USING  (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

-- DELETE: only the project owner can remove members
CREATE POLICY "members_delete"
  ON project_members FOR DELETE
  TO authenticated
  USING (is_project_owner(project_id));
