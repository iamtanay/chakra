export type Priority = 'High' | 'Medium' | 'Low'

// ── Work categories ────────────────────────────────────────────────────────
export type WorkCategory =
  | 'Document Generation'
  | 'Journal Writing'
  | 'Research'
  | 'Development'
  | 'Review / QA'
  | 'Design'

// ── Personal categories ───────────────────────────────────────────────────
export type PersonalCategory =
  | 'Finance & Banking'
  | 'Bills & Payments'
  | 'Home & Maintenance'
  | 'Cleaning & Chores'
  | 'Health & Wellness'
  | 'Errands & Shopping'
  | 'Family & Social'
  | 'Travel & Bookings'
  | 'Legal & Admin'
  | 'Self Care'

// ── Study categories ──────────────────────────────────────────────────────
export type StudyCategory =
  | 'Reading'
  | 'Note Taking'
  | 'Practice'
  | 'Revision'
  | 'Assignment'
  | 'Research'
  | 'Exam Prep'

// ── Union type used across the app ────────────────────────────────────────
export type Category = WorkCategory | PersonalCategory | StudyCategory

// ── Category lists per project type ──────────────────────────────────────
export const WORK_CATEGORIES: WorkCategory[] = [
  'Document Generation',
  'Journal Writing',
  'Research',
  'Development',
  'Review / QA',
  'Design',
]

export const PERSONAL_CATEGORIES: PersonalCategory[] = [
  'Finance & Banking',
  'Bills & Payments',
  'Home & Maintenance',
  'Cleaning & Chores',
  'Health & Wellness',
  'Errands & Shopping',
  'Family & Social',
  'Travel & Bookings',
  'Legal & Admin',
  'Self Care',
]

export const STUDY_CATEGORIES: StudyCategory[] = [
  'Reading',
  'Note Taking',
  'Practice',
  'Revision',
  'Assignment',
  'Research',
  'Exam Prep',
]

export type ProjectType = 'Work' | 'Study' | 'Personal'

export function getCategoriesForProjectType(type: ProjectType): Category[] {
  switch (type) {
    case 'Work':     return WORK_CATEGORIES
    case 'Personal': return PERSONAL_CATEGORIES
    case 'Study':    return STUDY_CATEGORIES
  }
}

export function getDefaultCategoryForProjectType(type: ProjectType): Category {
  switch (type) {
    case 'Work':     return 'Development'
    case 'Personal': return 'Errands & Shopping'
    case 'Study':    return 'Reading'
  }
}

export type Status = 'Todo' | 'In Progress' | 'Done'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'annual'

export type MemberRole = 'viewer' | 'editor'

export interface Project {
  id: string
  name: string
  color: string
  type: ProjectType
  created_at: string
  owner_id: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  shared_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: Category
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  today_flag: boolean
  created_at: string
  completed_at: string | null

  // ── Recurring fields ──────────────────────────────────────────────────────
  is_recurring: boolean
  recurrence_frequency: RecurrenceFrequency | null
  recurrence_day_of_week: number | null
  recurrence_day_of_month: number | null
  recurrence_month: number | null
  last_completed_cycle: string | null
  next_due_date: string | null

  // ── Momentum: consecutive on-time cycle counter ───────────────────────────
  current_streak: number

  // ── Traces: optional completion note ─────────────────────────────────────
  completion_note: string | null
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
