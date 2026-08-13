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
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Worker {
  id: string;
  full_name: string;
  cpf: string;
  registration_number: string;
  current_site_id: string | null;
  reference_photo_url?: string | null;
  facial_descriptor?: any | null;
  created_at: string;
  site?: ConstructionSite;
}

export interface EpiInventory {
  id: string;
  category: string;
  tracking_code: string;
  status: EpiStatus;
  ca_number: string;
  size: string;
  ca_expiration_date: string | null;
  recommended_lifespan_days: number;
  created_at: string;
}

export interface EpiAssignment {
  id: string;
  epi_id: string;
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
  epi?: EpiInventory;
  worker?: Worker;
}
