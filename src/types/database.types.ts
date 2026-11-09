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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      almoxarifado_orders: {
        Row: {
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          delivered_by: string | null
          id: string
          items: Json
          notes: string | null
          order_number: number
          requested_at: string
          selfie_url: string | null
          signature_url: string | null
          site_id: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          requested_at?: string
          selfie_url?: string | null
          signature_url?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivered_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          requested_at?: string
          selfie_url?: string | null
          signature_url?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "almoxarifado_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almoxarifado_orders_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cnpj: string
          created_at: string
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
        }
        Relationships: []
      }
      disciplinary_records: {
        Row: {
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          applied_at: string
          applied_by: string | null
          applied_by_id: string | null
          content_html: string
          created_at: string
          id: string
          pdf_url: string | null
          title: string
          type: Database["public"]["Enums"]["disciplinary_type"]
          worker_id: string
        }
        Insert: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          applied_at?: string
          applied_by?: string | null
          applied_by_id?: string | null
          content_html: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          title: string
          type: Database["public"]["Enums"]["disciplinary_type"]
          worker_id: string
        }
        Update: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          applied_at?: string
          applied_by?: string | null
          applied_by_id?: string | null
          content_html?: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          title?: string
          type?: Database["public"]["Enums"]["disciplinary_type"]
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      epi_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
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
          evidence_type: string | null
          expected_return_date: string | null
          generated_pdf_url: string | null
          id: string
          liveness_verified: boolean | null
          order_id: string | null
          quantity: number
          return_signature_url: string | null
          returned_at: string | null
          site_id: string | null
          tracking_code: string | null
          unit_price_at_delivery: number
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
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
          evidence_type?: string | null
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          order_id?: string | null
          quantity?: number
          return_signature_url?: string | null
          returned_at?: string | null
          site_id?: string | null
          tracking_code?: string | null
          unit_price_at_delivery?: number
          worker_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
          evidence_type?: string | null
          expected_return_date?: string | null
          generated_pdf_url?: string | null
          id?: string
          liveness_verified?: boolean | null
          order_id?: string | null
          quantity?: number
          return_signature_url?: string | null
          returned_at?: string | null
          site_id?: string | null
          tracking_code?: string | null
          unit_price_at_delivery?: number
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
          deleted_at: string | null
          description: string | null
          discard_notes: string | null
          discard_reason: string | null
          discarded_at: string | null
          id: string
          image_url: string | null
          lifespan_days: number | null
          min_stock: number | null
          minimum_stock: number | null
          model: string | null
          name: string
          observations: string | null
          recommended_lifespan_days: number | null
          status: string | null
          tracking_code: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category: string
          code?: string | null
          created_at?: string
          current_stock?: number | null
          deleted_at?: string | null
          description?: string | null
          discard_notes?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          min_stock?: number | null
          minimum_stock?: number | null
          model?: string | null
          name: string
          observations?: string | null
          recommended_lifespan_days?: number | null
          status?: string | null
          tracking_code?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          ca_number?: string | null
          ca_validity?: string | null
          category?: string
          code?: string | null
          created_at?: string
          current_stock?: number | null
          deleted_at?: string | null
          description?: string | null
          discard_notes?: string | null
          discard_reason?: string | null
          discarded_at?: string | null
          id?: string
          image_url?: string | null
          lifespan_days?: number | null
          min_stock?: number | null
          minimum_stock?: number | null
          model?: string | null
          name?: string
          observations?: string | null
          recommended_lifespan_days?: number | null
          status?: string | null
          tracking_code?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      epi_purchases: {
        Row: {
          arrival_date: string
          catalog_id: string
          created_at: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          quantity: number
          registered_by: string | null
          site_id: string | null
          supplier: string | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          arrival_date?: string
          catalog_id: string
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          quantity: number
          registered_by?: string | null
          site_id?: string | null
          supplier?: string | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          arrival_date?: string
          catalog_id?: string
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          quantity?: number
          registered_by?: string | null
          site_id?: string | null
          supplier?: string | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "epi_purchases_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epi_purchases_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          catalog_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity_change: number | null
          site_id: string | null
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
          site_id?: string | null
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
          site_id?: string | null
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
            foreignKeyName: "inventory_transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
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
      site_inventory: {
        Row: {
          catalog_id: string
          id: string
          quantity: number
          site_id: string
          updated_at: string | null
        }
        Insert: {
          catalog_id: string
          id?: string
          quantity?: number
          site_id: string
          updated_at?: string | null
        }
        Update: {
          catalog_id?: string
          id?: string
          quantity?: number
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_inventory_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_inventory_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_transfers: {
        Row: {
          catalog_id: string
          created_at: string | null
          destination_site_id: string
          id: string
          notes: string | null
          origin_site_id: string
          quantity: number
          received_at: string | null
          receiver_name: string | null
          receiver_user_id: string | null
          sender_name: string
          sender_user_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["transfer_status"]
        }
        Insert: {
          catalog_id: string
          created_at?: string | null
          destination_site_id: string
          id?: string
          notes?: string | null
          origin_site_id: string
          quantity: number
          received_at?: string | null
          receiver_name?: string | null
          receiver_user_id?: string | null
          sender_name: string
          sender_user_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Update: {
          catalog_id?: string
          created_at?: string | null
          destination_site_id?: string
          id?: string
          notes?: string | null
          origin_site_id?: string
          quantity?: number
          received_at?: string | null
          receiver_name?: string | null
          receiver_user_id?: string | null
          sender_name?: string
          sender_user_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "site_transfers_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "epi_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_transfers_destination_site_id_fkey"
            columns: ["destination_site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_transfers_origin_site_id_fkey"
            columns: ["origin_site_id"]
            isOneToOne: false
            referencedRelation: "construction_sites"
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
      training_catalog: {
        Row: {
          created_at: string | null
          default_validity_months: number
          id: string
          nr_code: string
          title: string
          workload_hours: number
        }
        Insert: {
          created_at?: string | null
          default_validity_months?: number
          id?: string
          nr_code: string
          title: string
          workload_hours?: number
        }
        Update: {
          created_at?: string | null
          default_validity_months?: number
          id?: string
          nr_code?: string
          title?: string
          workload_hours?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          custom_role: string | null
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          custom_role?: string | null
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          custom_role?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      worker_asos: {
        Row: {
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          created_at: string | null
          doctor_name: string | null
          document_url: string | null
          fit_for_confined_space: boolean
          fit_for_height: boolean
          id: string
          issued_at: string
          type: Database["public"]["Enums"]["aso_type"]
          valid_until: string
          validity_years: number
          worker_id: string
        }
        Insert: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          created_at?: string | null
          doctor_name?: string | null
          document_url?: string | null
          fit_for_confined_space?: boolean
          fit_for_height?: boolean
          id?: string
          issued_at: string
          type: Database["public"]["Enums"]["aso_type"]
          valid_until: string
          validity_years: number
          worker_id: string
        }
        Update: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          created_at?: string | null
          doctor_name?: string | null
          document_url?: string | null
          fit_for_confined_space?: boolean
          fit_for_height?: boolean
          id?: string
          issued_at?: string
          type?: Database["public"]["Enums"]["aso_type"]
          valid_until?: string
          validity_years?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_asos_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
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
      worker_trainings: {
        Row: {
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          completed_at: string
          created_at: string | null
          id: string
          instructor_name: string
          notes: string | null
          photos_urls: Json
          training_id: string
          valid_until: string
          worker_id: string
        }
        Insert: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          completed_at: string
          created_at?: string | null
          id?: string
          instructor_name: string
          notes?: string | null
          photos_urls?: Json
          training_id: string
          valid_until: string
          worker_id: string
        }
        Update: {
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          completed_at?: string
          created_at?: string | null
          id?: string
          instructor_name?: string
          notes?: string | null
          photos_urls?: Json
          training_id?: string
          valid_until?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_trainings_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "training_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_trainings_worker_id_fkey"
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
          apt_for_confined_space: boolean
          apt_for_height: boolean
          apt_for_height_and_confined_space: boolean | null
          aso_date: string | null
          birth_date: string | null
          boot_size: string | null
          cpf: string
          created_at: string
          current_role: string | null
          current_site_id: string | null
          deleted_at: string | null
          department: string | null
          email: string | null
          facial_descriptor: Json | null
          full_name: string
          id: string
          initial_role: string | null
          phone_contact: string | null
          reference_photo_url: string | null
          registration_number: string
          status: string | null
          termination_date: string | null
          uniform_size: string | null
          updated_at: string | null
          work_sector: string | null
        }
        Insert: {
          admission_date?: string | null
          apt_for_confined_space?: boolean
          apt_for_height?: boolean
          apt_for_height_and_confined_space?: boolean | null
          aso_date?: string | null
          birth_date?: string | null
          boot_size?: string | null
          cpf: string
          created_at?: string
          current_role?: string | null
          current_site_id?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          facial_descriptor?: Json | null
          full_name: string
          id?: string
          initial_role?: string | null
          phone_contact?: string | null
          reference_photo_url?: string | null
          registration_number: string
          status?: string | null
          termination_date?: string | null
          uniform_size?: string | null
          updated_at?: string | null
          work_sector?: string | null
        }
        Update: {
          admission_date?: string | null
          apt_for_confined_space?: boolean
          apt_for_height?: boolean
          apt_for_height_and_confined_space?: boolean | null
          aso_date?: string | null
          birth_date?: string | null
          boot_size?: string | null
          cpf?: string
          created_at?: string
          current_role?: string | null
          current_site_id?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          facial_descriptor?: Json | null
          full_name?: string
          id?: string
          initial_role?: string | null
          phone_contact?: string | null
          reference_photo_url?: string | null
          registration_number?: string
          status?: string | null
          termination_date?: string | null
          uniform_size?: string | null
          updated_at?: string | null
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
      admin_create_user: {
        Args: {
          new_custom_role?: string
          new_email: string
          new_full_name: string
          new_password: string
          new_permissions?: Json
          new_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      admin_deactivate_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      assign_epi: {
        Args: { p_catalog_id: string; p_quantity?: number; p_worker_id: string }
        Returns: boolean
      }
      bulk_assign_epis: {
        Args: { p_assignments: Json; p_worker_id: string }
        Returns: boolean
      }
      cancel_or_delete_almoxarifado_order: {
        Args: { p_cancelled_by: string; p_order_id: string; p_reason?: string }
        Returns: Json
      }
      complete_almoxarifado_order: {
        Args: {
          p_delivered_by: string
          p_order_id: string
          p_selfie_url?: string
          p_signature_url?: string
        }
        Returns: Json
      }
      discard_epi: {
        Args: {
          p_catalog_id: string
          p_notes?: string
          p_quantity: number
          p_reason: string
        }
        Returns: boolean
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
      register_stock_entry: {
        Args: {
          p_catalog_id: string
          p_invoice_number?: string
          p_notes?: string
          p_quantity: number
          p_site_id: string
          p_supplier?: string
          p_unit_price?: number
        }
        Returns: Json
      }
      return_epi: {
        Args: {
          p_assignment_id: string
          p_condition?: Database["public"]["Enums"]["item_condition"]
        }
        Returns: boolean
      }
      set_site_stock: {
        Args: {
          p_catalog_id: string
          p_notes?: string
          p_quantity: number
          p_site_id: string
        }
        Returns: number
      }
      transfer_epi_receive: {
        Args: {
          p_receiver_id: string
          p_receiver_name: string
          p_transfer_id: string
        }
        Returns: boolean
      }
      transfer_epi_send: {
        Args: {
          p_catalog_id: string
          p_destination_site_id: string
          p_notes?: string
          p_origin_site_id: string
          p_quantity: number
          p_sender_id: string
          p_sender_name: string
        }
        Returns: string
      }
    }
    Enums: {
      aso_type:
        | "ADMISSIONAL"
        | "PERIODICO"
        | "RETORNO_TRABALHO"
        | "MUDANCA_FUNCAO"
        | "DEMISSIONAL"
      disciplinary_type:
        | "ORIENTACAO_SEGURANCA"
        | "ADVERTENCIA_VERBAL"
        | "ADVERTENCIA_ESCRITA"
        | "PERSONALIZADO"
      epi_status: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "DISCARDED"
      item_condition: "GOOD" | "DAMAGED" | "LOST"
      operation_type:
        | "DELIVERY"
        | "RETURN"
        | "REPLACEMENT"
        | "LOSS"
        | "STOCK_ADJUSTMENT"
      transfer_status: "EM_TRANSITO" | "RECEBIDO" | "CANCELADO"
      user_role: "ADMIN" | "SAFETY_ENGINEER" | "SITE_MANAGER" | "ALMOXARIFADO"
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
      aso_type: [
        "ADMISSIONAL",
        "PERIODICO",
        "RETORNO_TRABALHO",
        "MUDANCA_FUNCAO",
        "DEMISSIONAL",
      ],
      disciplinary_type: [
        "ORIENTACAO_SEGURANCA",
        "ADVERTENCIA_VERBAL",
        "ADVERTENCIA_ESCRITA",
        "PERSONALIZADO",
      ],
      epi_status: ["AVAILABLE", "IN_USE", "MAINTENANCE", "DISCARDED"],
      item_condition: ["GOOD", "DAMAGED", "LOST"],
      operation_type: [
        "DELIVERY",
        "RETURN",
        "REPLACEMENT",
        "LOSS",
        "STOCK_ADJUSTMENT",
      ],
      transfer_status: ["EM_TRANSITO", "RECEBIDO", "CANCELADO"],
      user_role: ["ADMIN", "SAFETY_ENGINEER", "SITE_MANAGER", "ALMOXARIFADO"],
    },
  },
} as const
