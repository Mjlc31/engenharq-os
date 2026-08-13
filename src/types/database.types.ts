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
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
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
      epi_inventory: {
        Row: {
          ca_expiration_date: string | null
          ca_number: string
          category: string
          created_at: string
          id: string
          recommended_lifespan_days: number | null
          size: string | null
          status: Database["public"]["Enums"]["epi_status"]
          tracking_code: string
        }
        Insert: {
          ca_expiration_date?: string | null
          ca_number: string
          category: string
          created_at?: string
          id?: string
          recommended_lifespan_days?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["epi_status"]
          tracking_code: string
        }
        Update: {
          ca_expiration_date?: string | null
          ca_number?: string
          category?: string
          created_at?: string
          id?: string
          recommended_lifespan_days?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["epi_status"]
          tracking_code?: string
        }
        Relationships: []
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
      workers: {
        Row: {
          cpf: string
          created_at: string
          current_site_id: string | null
          facial_descriptor: Json | null
          full_name: string
          id: string
          reference_photo_url: string | null
          registration_number: string
        }
        Insert: {
          cpf: string
          created_at?: string
          current_site_id?: string | null
          facial_descriptor?: Json | null
          full_name: string
          id?: string
          reference_photo_url?: string | null
          registration_number: string
        }
        Update: {
          cpf?: string
          created_at?: string
          current_site_id?: string | null
          facial_descriptor?: Json | null
          full_name?: string
          id?: string
          reference_photo_url?: string | null
          registration_number?: string
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
      [_ in never]: never
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
