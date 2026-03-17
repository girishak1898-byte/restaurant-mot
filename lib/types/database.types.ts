// Stub — replace with the real generated output once your Supabase project is live:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/types/database.types.ts

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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          is_super_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          is_super_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          mode: 'restaurant' | 'property'
          plan: 'free' | 'premium'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          mode?: 'restaurant' | 'property'
          plan?: 'free' | 'premium'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          mode?: 'restaurant' | 'property'
          plan?: 'free' | 'premium'
          updated_at?: string
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
        }
        Relationships: [
          {
            foreignKeyName: 'organization_memberships_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      uploads: {
        Row: {
          id: string
          organization_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          file_type: 'csv' | 'xlsx'
          file_size_bytes: number | null
          status: 'pending' | 'processing' | 'done' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          file_type: 'csv' | 'xlsx'
          file_size_bytes?: number | null
          status?: 'pending' | 'processing' | 'done' | 'error'
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'processing' | 'done' | 'error'
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'uploads_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      import_jobs: {
        Row: {
          id: string
          organization_id: string
          upload_id: string
          target_table: string
          rows_total: number
          rows_imported: number
          rows_failed: number
          error_log: Json | null
          status: 'pending' | 'running' | 'done' | 'error'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          upload_id: string
          target_table: string
          rows_total?: number
          rows_imported?: number
          rows_failed?: number
          error_log?: Json | null
          status?: 'pending' | 'running' | 'done' | 'error'
          created_at?: string
          updated_at?: string
        }
        Update: {
          rows_total?: number
          rows_imported?: number
          rows_failed?: number
          error_log?: Json | null
          status?: 'pending' | 'running' | 'done' | 'error'
          updated_at?: string
        }
        Relationships: []
      }
      import_mappings: {
        Row: {
          id: string
          organization_id: string
          target_table: string
          mapping_name: string
          column_map: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          target_table: string
          mapping_name: string
          column_map: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          mapping_name?: string
          column_map?: Json
          updated_at?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          requested_plan: 'premium'
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          requested_plan?: 'premium'
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'upgrade_requests_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
        Relationships: []
      }
      restaurant_sales: {
        Row: {
          id: string
          organization_id: string
          source_upload_id: string | null
          sale_date: string
          order_id: string | null
          outlet_name: string | null
          channel: string | null
          item_name: string | null
          item_category: string | null
          quantity: number | null
          gross_amount: number | null
          discount_amount: number | null
          net_amount: number | null
          payment_method: string | null
          customer_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          source_upload_id?: string | null
          sale_date: string
          order_id?: string | null
          outlet_name?: string | null
          channel?: string | null
          item_name?: string | null
          item_category?: string | null
          quantity?: number | null
          gross_amount?: number | null
          discount_amount?: number | null
          net_amount?: number | null
          payment_method?: string | null
          customer_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sale_date?: string
          order_id?: string | null
          outlet_name?: string | null
          channel?: string | null
          item_name?: string | null
          item_category?: string | null
          quantity?: number | null
          gross_amount?: number | null
          discount_amount?: number | null
          net_amount?: number | null
          payment_method?: string | null
          customer_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_menu_items: {
        Row: {
          id: string
          organization_id: string
          source_upload_id: string | null
          item_name: string
          item_category: string | null
          base_price: number | null
          food_cost_per_item: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          source_upload_id?: string | null
          item_name: string
          item_category?: string | null
          base_price?: number | null
          food_cost_per_item?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          item_name?: string
          item_category?: string | null
          base_price?: number | null
          food_cost_per_item?: number | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_labour_shifts: {
        Row: {
          id: string
          organization_id: string
          source_upload_id: string | null
          shift_date: string
          staff_name: string | null
          role: string | null
          outlet_name: string | null
          hours_worked: number | null
          hourly_rate: number | null
          labour_cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          source_upload_id?: string | null
          shift_date: string
          staff_name?: string | null
          role?: string | null
          outlet_name?: string | null
          hours_worked?: number | null
          hourly_rate?: number | null
          labour_cost?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          shift_date?: string
          staff_name?: string | null
          role?: string | null
          outlet_name?: string | null
          hours_worked?: number | null
          hourly_rate?: number | null
          labour_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_organization_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      user_org_role: {
        Args: { org_id: string }
        Returns: string
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
