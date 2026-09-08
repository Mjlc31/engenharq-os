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
      construction_sites: {
        Row: {
          address: string | null
          cnpj: string | null
          cno: string | null
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          latitude: number
          longitude: number
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          cno?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          latitude: number
          longitude: number
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          cno?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          latitude?: number
          longitude?: number
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
          condition_on_return: string | null
          digital_signature_url: string | null
          epi_id: string
          expected_return_date: string | null
          generated_pdf_url: string | null
          id: string
          liveness_verified: boolean | null
          returned_at: string | null
          worker_id: string
        }
        Insert: {
          assigned_at?: string
          audit_selfie_url?: string | null
          biometric_match_score?: number | null
          condition_on_return?: string | null
          digital_signature_url?: string | null
          epi_id: string
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          returned_at?: string | null
          worker_id: string
        }
        Update: {
          assigned_at?: string
          audit_selfie_url?: string | null
          biometric_match_score?: number | null
          condition_on_return?: string | null
          digital_signature_url?: string | null
          epi_id?: string
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          returned_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_assignments_epi_id_fkey"
            columns: ["epi_id"]
            isOneToOne: false
            referencedRelation: "epi_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          }
        ]
      }
      epi_catalog: {
        Row: {
          brand: string | null
          ca_number: string | null
          ca_validity: string | null
          category: string
          created_at: string
          current_stock: number | null
          description: string | null
          id: string
          image_url: string | null
          lifespan_days: number | null
          minimum_stock: number | null
          name: string
          observations: string | null
        }
        Insert: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category: string
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          minimum_stock?: number | null
          name: string
          observations?: string | null
        }
        Update: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category?: string
          created_at?: string
          current_stock?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          minimum_stock?: number | null
          name?: string
          observations?: string | null
        }
        Relationships: []
      }
      epi_inventory: {
        Row: {
          ca_expiration_date: string | null
          ca_number: string
          category: string | null
          created_at: string
          epi_catalog_id: string | null
          id: string
          recommended_lifespan_days: number | null
          size: string | null
          status: Database["public"]["Enums"]["epi_status"]
          tracking_code: string
        }
        Insert: {
          ca_expiration_date?: string | null
          ca_number: string
          category?: string | null
          created_at?: string
          epi_catalog_id?: string | null
          id?: string
          recommended_lifespan_days?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["epi_status"]
          tracking_code: string
        }
        Update: {
          ca_expiration_date?: string | null
          ca_number?: string
          category?: string | null
          created_at?: string
          epi_catalog_id?: string | null
          id?: string
          recommended_lifespan_days?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["epi_status"]
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "epi_inventory_epi_catalog_id_fkey"
            columns: ["epi_catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
          }
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
          current_site_id: string | null
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
          current_site_id?: string | null
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
          current_site_id?: string | null
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
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_epi: {
        Args: {
          p_worker_id: string
          p_epi_id: string
        }
        Returns: boolean
      }
      return_epi: {
        Args: {
          p_epi_id: string
        }
        Returns: boolean
      }
      bulk_assign_epis: {
        Args: {
          p_worker_id: string
          p_assignments: Json
        }
        Returns: boolean
      }
    }
    Enums: {
      epi_status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "DISCARDED"
      user_role: "ADMIN" | "SAFETY_ENGINEER" | "SITE_MANAGER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
