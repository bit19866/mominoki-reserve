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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          sort_order?: number
        }
      }
      menus: {
        Row: {
          id: string
          name: string
          duration_minutes: number
          price: number
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
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          staff_id: string
          menu_id: string
          reservation_date: string
          start_time: string
          end_time: string
          status: 'confirmed' | 'cancelled' | 'completed'
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          staff_id: string
          menu_id: string
          reservation_date: string
          start_time: string
          end_time: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          notes?: string | null
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
          notes?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Staff = Database['public']['Tables']['staff']['Row']
export type Menu = Database['public']['Tables']['menus']['Row']
export type Setting = Database['public']['Tables']['settings']['Row']
export type Reservation = Database['public']['Tables']['reservations']['Row']

export type ReservationWithDetails = Reservation & {
  staff: Staff
  menu: Menu
}
