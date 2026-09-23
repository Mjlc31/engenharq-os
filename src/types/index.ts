export type UserRole = 'ADMIN' | 'SAFETY_ENGINEER' | 'SITE_MANAGER';
export type EpiStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISCARDED';

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  created_at: string;
}

export interface ConstructionSite {
  id: string;
  code?: string | null;
  name: string;
  model?: string | null;
  status?: string | null;
  city?: string | null;
  manager_name?: string | null;
  cnpj?: string | null;
  cno?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  address?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

export interface WorkerRole {
  id: string;
  worker_id: string;
  role_name: string;
  start_date: string;
  created_at: string;
}

export interface Worker {
  id: string;
  full_name: string;
  email?: string | null;
  cpf: string;
  registration_number: string;
  initial_role?: string | null;
  current_role?: string | null;
  admission_date?: string | null;
  birth_date?: string | null;
  work_sector?: string | null;
  uniform_size?: string | null;
  boot_size?: string | null;
  apt_for_height_and_confined_space?: boolean | null;
  phone_contact?: string | null;
  current_site_id: string | null;
  reference_photo_url?: string | null;
  facial_descriptor?: number[];
  status?: string | null;
  created_at: string;
  site?: ConstructionSite;
  roles?: WorkerRole[];
}

export interface EpiCatalog {
  id: string;
  code?: string | null;
  name: string;
  category: string;
  model?: string | null;
  description?: string | null;
  brand?: string | null;
  ca_number?: string | null;
  ca_validity?: string | null;
  lifespan_days?: number | null;
  minimum_stock?: number | null;
  current_stock?: number | null;
  image_url?: string | null;
  status?: string | null;
  observations?: string | null;
  created_at: string;
}

export interface EpiInventory {
  id: string;
  epi_catalog_id?: string | null;
  category?: string | null;
  tracking_code: string;
  status: EpiStatus;
  ca_number: string;
  size: string | null;
  ca_expiration_date: string | null;
  recommended_lifespan_days: number | null;
  created_at: string;
  catalog?: EpiCatalog;
}

export interface EpiAssignment {
  id: string;
  catalog_id: string;
  worker_id: string;
  assigned_at: string;
  returned_at: string | null;
  condition_on_return: string | null;
  digital_signature_url: string | null;
  generated_pdf_url: string | null;
  audit_selfie_url?: string | null;
  biometric_match_score?: number | null;
  liveness_verified?: boolean | null;
  expected_return_date: string | null;
  catalog?: unknown;
  worker?: Worker;
}
