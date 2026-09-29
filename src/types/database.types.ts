export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          cnpj: string
          created_at: string
          email: string | null
          id: string
          legal_name: string
          legal_representative: string | null
          logo_url: string | null
          phone: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name: string
          legal_representative?: string | null
          logo_url?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string
          legal_representative?: string | null
          logo_url?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      construction_sites: {
        Row: {
          address: string | null
          city: string | null
          cno: string | null
          cnpj: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          end_date: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          manager_name: string | null
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cno?: string | null
          cnpj?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_name?: string | null
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cno?: string | null
          cnpj?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          manager_name?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      epi_assignments: {
        Row: {
          assigned_at: string
          audit_selfie_url: string | null
          biometric_match_score: number | null
          ca_number: string | null
          catalog_id: string
          condition_on_delivery:
            | Database["public"]["Enums"]["item_condition"]
            | null
          condition_on_return: string | null
          deleted_at: string | null
          digital_signature_url: string | null
          expected_return_date: string | null
          generated_pdf_url: string | null
          id: string
          liveness_verified: boolean | null
          quantity: number
          return_signature_url: string | null
          returned_at: string | null
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          audit_selfie_url?: string | null
          biometric_match_score?: number | null
          ca_number?: string | null
          catalog_id: string
          condition_on_delivery?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          condition_on_return?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          quantity?: number
          return_signature_url?: string | null
          returned_at?: string | null
          worker_id: string
        }
        Update: {
          assigned_at?: string
          audit_selfie_url?: string | null
          biometric_match_score?: number | null
          ca_number?: string | null
          catalog_id?: string
          condition_on_delivery?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          condition_on_return?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          quantity?: number
          return_signature_url?: string | null
          returned_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_assignments_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_catalog: {
        Row: {
          brand: string | null
          ca_number: string | null
          ca_validity: string | null
          category: string
          code: string | null
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          lifespan_days: number | null
          minimum_stock: number | null
          model: string | null
          name: string
          observations: string | null
          status: string | null
        }
        Insert: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category: string
          code?: string | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          minimum_stock?: number | null
          model?: string | null
          name: string
          observations?: string | null
          status?: string | null
        }
        Update: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category?: string
          code?: string | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          minimum_stock?: number | null
          model?: string | null
          name?: string
          observations?: string | null
          status?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          catalog_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity_change: number | null
          transaction_type: string
          worker_id: string | null
        }
        Insert: {
          catalog_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_change?: number | null
          transaction_type: string
          worker_id?: string | null
        }
        Update: {
          catalog_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_change?: number | null
          transaction_type?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          company_name: string | null
          created_at: string
          default_expiration_alert_days: number | null
          epi_declaration_text: string | null
          epi_legal_base_text: string | null
          epi_terms_text: string | null
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          default_expiration_alert_days?: number | null
          epi_declaration_text?: string | null
          epi_legal_base_text?: string | null
          epi_terms_text?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          default_expiration_alert_days?: number | null
          epi_declaration_text?: string | null
          epi_legal_base_text?: string | null
          epi_terms_text?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      worker_roles: {
        Row: {
          created_at: string
          id: string
          role_name: string
          start_date: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_name: string
          start_date: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_name?: string
          start_date?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_roles_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_roles_history: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          role_name: string | null
          start_date: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          role_name?: string | null
          start_date?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          role_name?: string | null
          start_date?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_roles_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          admission_date: string | null
          apt_for_height_and_confined_space: boolean | null
          birth_date: string | null
          boot_size: string | null
          cpf: string
          created_at: string
          current_role: string | null
          current_site_id: string | null
          deleted_at: string | null
          email: string | null
          facial_descriptor: Json | null
          full_name: string
          id: string
          initial_role: string | null
          phone_contact: string | null
          reference_photo_url: string | null
          registration_number: string
          status: string | null
          uniform_size: string | null
          work_sector: string | null
        }
        Insert: {
          admission_date?: string | null
          apt_for_height_and_confined_space?: boolean | null
          birth_date?: string | null
          boot_size?: string | null
          cpf: string
          created_at?: string
          current_role?: string | null
          current_site_id?: string | null
          deleted_at?: string | null
          email?: string | null
          facial_descriptor?: Json | null
          full_name: string
          id?: string
          initial_role?: string | null
          phone_contact?: string | null
          reference_photo_url?: string | null
          registration_number: string
          status?: string | null
          uniform_size?: string | null
          work_sector?: string | null
        }
        Update: {
          admission_date?: string | null
          apt_for_height_and_confined_space?: boolean | null
          birth_date?: string | null
          boot_size?: string | null
          cpf?: string
          created_at?: string
          current_role?: string | null
          current_site_id?: string | null
          deleted_at?: string | null
          email?: string | null
          facial_descriptor?: Json | null
          full_name?: string
          id?: string
          initial_role?: string | null
          phone_contact?: string | null
          reference_photo_url?: string | null
          registration_number?: string
          status?: string | null
          uniform_size?: string | null
          work_sector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_current_site_id_fkey"
            columns: ["current_site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_epi: {
        Args: { p_catalog_id: string; p_quantity?: number; p_worker_id: string }
        Returns: boolean
      }
      bulk_assign_epis: {
        Args: { p_assignments: Json; p_worker_id: string }
        Returns: boolean
      }
      checkout_epi: {
        Args: {
          p_epi_id: string
          p_expected_return_date?: string
          p_worker_id: string
        }
        Returns: string
      }
      get_dashboard_alerts: {
        Args: never
        Returns: {
          alert_type: string
          assignment_id: string
          ca_number: string
          catalog_id: string
          days_remaining: number
          epi_name: string
          worker_id: string
          worker_name: string
        }[]
      }
      is_valid_cpf: { Args: { cpf: string }; Returns: boolean }
      return_epi: {
        Args: {
          p_assignment_id: string
          p_condition?: Database["public"]["Enums"]["item_condition"]
        }
        Returns: boolean
      }
    }
    Enums: {
      epi_status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "DISCARDED"
      item_condition: "GOOD" | "DAMAGED" | "LOST"
      operation_type:
        | "DELIVERY"
        | "RETURN"
        | "REPLACEMENT"
        | "LOSS"
        | "STOCK_ADJUSTMENT"
      user_role: "ADMIN" | "SAFETY_ENGINEER" | "SITE_MANAGER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      epi_status: ["AVAILABLE", "IN_USE", "MAINTENANCE", "DISCARDED"],
      item_condition: ["GOOD", "DAMAGED", "LOST"],
      operation_type: [
        "DELIVERY",
        "RETURN",
        "REPLACEMENT",
        "LOSS",
        "STOCK_ADJUSTMENT",
      ],
      user_role: ["ADMIN", "SAFETY_ENGINEER", "SITE_MANAGER"],
    },
  },
} as const

