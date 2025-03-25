// lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          budget_limit: number | null
          spending_goal: string | null
          currency: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          budget_limit?: number | null
          spending_goal?: string | null
          currency?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          budget_limit?: number | null
          spending_goal?: string | null
          currency?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          amount: number
          period: string
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
          ai_optimized: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          amount: number
          period: string
          start_date: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
          ai_optimized?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          amount?: number
          period?: string
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
          ai_optimized?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_allocations: {
        Row: {
          id: string
          budget_id: string
          category_id: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          category_id: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          category_id?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          budget_id: string | null
          category_id: string | null
          amount: number
          description: string | null
          date: string
          created_at: string
          updated_at: string
          location: string | null
          receipt_url: string | null
          is_recurring: boolean
        }
        Insert: {
          id?: string
          user_id: string
          budget_id?: string | null
          category_id?: string | null
          amount: number
          description?: string | null
          date: string
          created_at?: string
          updated_at?: string
          location?: string | null
          receipt_url?: string | null
          is_recurring?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          budget_id?: string | null
          category_id?: string | null
          amount?: number
          description?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          location?: string | null
          receipt_url?: string | null
          is_recurring?: boolean
        }
      }
      income: {
        Row: {
          id: string
          user_id: string
          amount: number
          description: string | null
          date: string
          created_at: string
          updated_at: string
          is_recurring: boolean
          frequency: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          description?: string | null
          date: string
          created_at?: string
          updated_at?: string
          is_recurring?: boolean
          frequency?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          description?: string | null
          date?: string
          created_at?: string
          updated_at?: string
          is_recurring?: boolean
          frequency?: string | null
        }
      }
      budget_insights: {
        Row: {
          id: string
          user_id: string
          budget_id: string | null
          insight_type: string
          description: string
          created_at: string
          applied: boolean
        }
        Insert: {
          id?: string
          user_id: string
          budget_id?: string | null
          insight_type: string
          description: string
          created_at?: string
          applied?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          budget_id?: string | null
          insight_type?: string
          description?: string
          created_at?: string
          applied?: boolean
        }
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_alerts: {
        Row: {
          id: string
          user_id: string
          budget_id: string | null
          category_id: string | null
          threshold_percentage: number
          message: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          budget_id?: string | null
          category_id?: string | null
          threshold_percentage: number
          message?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          budget_id?: string | null
          category_id?: string | null
          threshold_percentage?: number
          message?: string | null
          created_at?: string
          is_active?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updateables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']