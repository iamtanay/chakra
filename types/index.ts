export type Priority = 'High' | 'Medium' | 'Low'

export type Category =
  | 'Document Generation'
  | 'Journal Writing'
  | 'Research'
  | 'Development'
  | 'Review / QA'
  | 'Design'

export type Status = 'Todo' | 'In Progress' | 'Done'

export type ProjectType = 'Work' | 'Study' | 'Personal'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'annual'

export interface Project {
  id: string
  name: string
  color: string
  type: ProjectType
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: Category
  due_date: string | null           // For one-off: the due date. For recurring: the start/anchor date.
  estimated_hours: number | null
  actual_hours: number | null
  today_flag: boolean
  created_at: string
  completed_at: string | null

  // ── Recurring fields ──────────────────────────────────────────────────────
  is_recurring: boolean
  recurrence_frequency: RecurrenceFrequency | null
  recurrence_day_of_week: number | null    // 0–6, Sun=0; weekly tasks
  recurrence_day_of_month: number | null   // 1–31; monthly + annual tasks
  recurrence_month: number | null          // 1–12; annual tasks
  last_completed_cycle: string | null      // ISO date string (YYYY-MM-DD)
  next_due_date: string | null             // ISO date string (YYYY-MM-DD)
}

export interface DailyPulse {
  tasks_completed_today: number
  hours_today: number
  top_project: string | null
}

export interface ReportInsight {
  line: string
}

export interface TaskWithProject extends Task {
  project?: Project
}
