/*
  # Create projects and tasks tables

  1. New Tables
    - `projects`
      - `id` (uuid, primary key, auto-generated)
      - `name` (text, required)
      - `color` (text, required) — hex color code
      - `type` (text, required) — Work / Study / Personal
      - `created_at` (timestamptz, auto-set)
    
    - `tasks`
      - `id` (uuid, primary key, auto-generated)
      - `project_id` (uuid, foreign key to projects, cascade delete)
      - `title` (text, required)
      - `description` (text, optional)
      - `status` (text, required) — Todo / In Progress / Done
      - `priority` (text, required) — High / Medium / Low
      - `category` (text, required) — fixed 6 categories
      - `due_date` (date, optional)
      - `estimated_hours` (numeric, optional)
      - `actual_hours` (numeric, optional)
      - `today_flag` (boolean, required)
      - `created_at` (timestamptz, auto-set)
      - `completed_at` (timestamptz, optional)

  2. Security
    - Enable RLS on both tables
    - Single user app — authenticated users have full access to all rows
    - Policies allow all operations for authenticated users

  3. Indexes
    - project_id (tasks table)
    - status (tasks table)
    - completed_at (tasks table)
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  type text NOT NULL DEFAULT 'Work'
    CHECK (type IN ('Work', 'Study', 'Personal')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Todo'
    CHECK (status IN ('Todo', 'In Progress', 'Done')),
  priority text NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('High', 'Medium', 'Low')),
  category text NOT NULL
    CHECK (category IN (
      'Document Generation', 'Journal Writing',
      'Research', 'Development', 'Review / QA', 'Design'
    )),
  due_date date,
  estimated_hours numeric(4,1),
  actual_hours numeric(4,1),
  today_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on projects"
  ON projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated full access on tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
