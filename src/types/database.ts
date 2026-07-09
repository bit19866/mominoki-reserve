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
          full_name: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          email?: string | null
          updated_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          active: boolean
          sort_order: number
          commission_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          sort_order?: number
          commission_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          sort_order?: number
          commission_rate?: number | null
        }
      }
      menus: {
        Row: {
          id: string
          name: string
          duration_minutes: number
          price: number
          price_ex_tax: number | null
          category: string | null
          active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          duration_minutes: number
          price: number
          price_ex_tax?: number | null
          category?: string | null
          active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          duration_minutes?: number
          price?: number
          price_ex_tax?: number | null
          category?: string | null
          active?: boolean
          sort_order?: number
        }
      }
      settings: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          value?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string | null
          staff_id: string
          menu_id: string
          reservation_date: string
          start_time: string
          end_time: string
          status: 'confirmed' | 'cancelled' | 'completed'
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          gender: 'male' | 'female' | 'other' | null
          notes: string | null
          source: string | null
          payment_method: string | null
          is_new_customer: boolean | null
          age_group: string | null
          next_visit_booked: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          staff_id: string
          menu_id: string
          reservation_date: string
          start_time: string
          end_time: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          gender?: 'male' | 'female' | 'other' | null
          notes?: string | null
          source?: string | null
          payment_method?: string | null
          is_new_customer?: boolean | null
          age_group?: string | null
          next_visit_booked?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          staff_id?: string
          menu_id?: string
          reservation_date?: string
          start_time?: string
          end_time?: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          gender?: 'male' | 'female' | 'other' | null
          notes?: string | null
          source?: string | null
          payment_method?: string | null
          is_new_customer?: boolean | null
          age_group?: string | null
          next_visit_booked?: boolean | null
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          reservation_id: string
          customer_name: string | null
          staff_name: string | null
          menu_name: string | null
          reservation_date: string
          base_price: number
          options: Json | null
          discount: number
          total_amount: number
          payment_method: string
          cash_received: number | null
          change_amount: number | null
          notes: string | null
          created_by: string | null
          paid_at: string
        }
        Insert: {
          id?: string
          reservation_id: string
          customer_name?: string | null
          staff_name?: string | null
          menu_name?: string | null
          reservation_date: string
          base_price: number
          options?: Json | null
          discount?: number
          total_amount: number
          payment_method: string
          cash_received?: number | null
          change_amount?: number | null
          notes?: string | null
          created_by?: string | null
          paid_at?: string
        }
        Update: {
          total_amount?: number
          payment_method?: string
          notes?: string | null
        }
      }
      store_holidays: {
        Row: {
          id: string
          holiday_date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          holiday_date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          holiday_date?: string
          reason?: string | null
        }
      }
      staff_day_offs: {
        Row: {
          id: string
          staff_id: string
          off_date: string
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          off_date: string
          created_at?: string
        }
        Update: {
          staff_id?: string
          off_date?: string
        }
      }
      staff_weekly_schedule: {
        Row: {
          id: string
          staff_id: string
          day_of_week: number
          is_working: boolean
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          day_of_week: number
          is_working?: boolean
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          is_working?: boolean
          start_time?: string | null
          end_time?: string | null
        }
      }
      staff_schedule_overrides: {
        Row: {
          id: string
          staff_id: string
          override_date: string
          is_working: boolean
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: string
          staff_id: string
          override_date: string
          is_working?: boolean
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          is_working?: boolean
          start_time?: string | null
          end_time?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Profile     = Database['public']['Tables']['profiles']['Row']
export type Staff       = Database['public']['Tables']['staff']['Row']
export type Menu        = Database['public']['Tables']['menus']['Row']
export type Setting     = Database['public']['Tables']['settings']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']

export type ReservationWithDetails = Reservation & {
  staff: Staff
  menu: Menu
}
