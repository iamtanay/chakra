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
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          color: string
          type?: 'Work' | 'Study' | 'Personal'
          created_at?: string
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          type?: 'Work' | 'Study' | 'Personal'
          created_at?: string
          owner_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: 'viewer' | 'editor'
          shared_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role?: 'viewer' | 'editor'
          shared_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: 'viewer' | 'editor'
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
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
            | 'Reading'
            | 'Note Taking'
            | 'Practice'
            | 'Revision'
            | 'Assignment'
            | 'Exam Prep'
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
          current_streak: number
          completion_note: string | null
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
            | 'Reading'
            | 'Note Taking'
            | 'Practice'
            | 'Revision'
            | 'Assignment'
            | 'Exam Prep'
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
          current_streak?: number
          completion_note?: string | null
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
            | 'Reading'
            | 'Note Taking'
            | 'Practice'
            | 'Revision'
            | 'Assignment'
            | 'Exam Prep'
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
          current_streak?: number
          completion_note?: string | null
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
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
