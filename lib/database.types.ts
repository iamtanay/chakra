export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          color: string
          type: 'Work' | 'Study' | 'Personal'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          type?: 'Work' | 'Study' | 'Personal'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          type?: 'Work' | 'Study' | 'Personal'
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'Todo' | 'In Progress' | 'Done'
          priority: 'High' | 'Medium' | 'Low'
          category:
            | 'Document Generation'
            | 'Journal Writing'
            | 'Research'
            | 'Development'
            | 'Review / QA'
            | 'Design'
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          today_flag: boolean
          created_at: string
          completed_at: string | null
          is_recurring: boolean
          recurrence_frequency: 'daily' | 'weekly' | 'monthly' | 'annual' | null
          recurrence_day_of_week: number | null
          recurrence_day_of_month: number | null
          recurrence_month: number | null
          last_completed_cycle: string | null
          next_due_date: string | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'Todo' | 'In Progress' | 'Done'
          priority?: 'High' | 'Medium' | 'Low'
          category:
            | 'Document Generation'
            | 'Journal Writing'
            | 'Research'
            | 'Development'
            | 'Review / QA'
            | 'Design'
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          today_flag?: boolean
          created_at?: string
          completed_at?: string | null
          is_recurring?: boolean
          recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'annual' | null
          recurrence_day_of_week?: number | null
          recurrence_day_of_month?: number | null
          recurrence_month?: number | null
          last_completed_cycle?: string | null
          next_due_date?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'Todo' | 'In Progress' | 'Done'
          priority?: 'High' | 'Medium' | 'Low'
          category?:
            | 'Document Generation'
            | 'Journal Writing'
            | 'Research'
            | 'Development'
            | 'Review / QA'
            | 'Design'
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          today_flag?: boolean
          created_at?: string
          completed_at?: string | null
          is_recurring?: boolean
          recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | 'annual' | null
          recurrence_day_of_week?: number | null
          recurrence_day_of_month?: number | null
          recurrence_month?: number | null
          last_completed_cycle?: string | null
          next_due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
