export type UserRole = 'ADMIN' | 'SAFETY_ENGINEER' | 'SITE_MANAGER';
export type EpiStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISCARDED';
export type TransferStatus = 'EM_TRANSITO' | 'RECEBIDO' | 'CANCELADO';
export type AsoType = 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_FUNCAO' | 'DEMISSIONAL';
export type DisciplinaryType = 'ORIENTACAO_SEGURANCA' | 'ADVERTENCIA_VERBAL' | 'ADVERTENCIA_ESCRITA' | 'PERSONALIZADO';

export interface UserPermissions {
  dashboard?: { view?: boolean };
  cadastros?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
  estoque?: { view?: boolean; create?: boolean; edit?: boolean; descarte?: boolean };
  operacoes?: { entregas?: boolean; transferencias_enviar?: boolean; transferencias_receber?: boolean };
  sst?: { treinamentos?: boolean; aso?: boolean };
  relatorios?: { ficha_epi?: boolean; historico_financeiro?: boolean; medidas_disciplinares?: boolean };
  configuracoes?: { gerenciar_usuarios?: boolean };
  [key: string]: any;
}

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  permissions?: UserPermissions;
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
  deleted_at?: string | null;
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
  apt_for_height?: boolean;
  apt_for_confined_space?: boolean;
  apt_for_height_and_confined_space?: boolean | null;
  phone_contact?: string | null;
  current_site_id: string | null;
  reference_photo_url?: string | null;
  facial_descriptor?: number[];
  status?: string | null;
  aso_date?: string | null;
  created_at: string;
  site?: ConstructionSite;
  roles?: WorkerRole[];
  deleted_at?: string | null;
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
  unit_price?: number;
  discard_reason?: string | null;
  discard_notes?: string | null;
  discarded_at?: string | null;
  image_url?: string | null;
  status?: string | null;
  observations?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface EpiPurchase {
  id: string;
  catalog_id: string;
  site_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price?: number | null;
  invoice_number?: string | null;
  supplier?: string | null;
  arrival_date: string;
  registered_by?: string | null;
  notes?: string | null;
  created_at?: string | null;
  catalog?: EpiCatalog;
  site?: ConstructionSite;
}

export interface SiteInventory {
  id: string;
  site_id: string;
  catalog_id: string;
  quantity: number;
  updated_at?: string | null;
  catalog?: EpiCatalog;
  site?: ConstructionSite;
}

export interface SiteTransfer {
  id: string;
  catalog_id: string;
  origin_site_id: string;
  destination_site_id: string;
  quantity: number;
  status: TransferStatus;
  sender_user_id?: string | null;
  sender_name: string;
  sent_at: string;
  receiver_user_id?: string | null;
  receiver_name?: string | null;
  received_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  catalog?: EpiCatalog;
  origin_site?: ConstructionSite;
  destination_site?: ConstructionSite;
}

export interface TrainingCatalog {
  id: string;
  nr_code: string;
  title: string;
  workload_hours: number;
  default_validity_months: number;
  created_at?: string | null;
}

export interface WorkerTraining {
  id: string;
  worker_id: string;
  training_id: string;
  instructor_name: string;
  completed_at: string;
  valid_until: string;
  photos_urls: string[];
  notes?: string | null;
  created_at?: string | null;
  training?: TrainingCatalog;
  worker?: Worker;
}

export interface WorkerAso {
  id: string;
  worker_id: string;
  type: AsoType;
  issued_at: string;
  validity_years: number;
  valid_until: string;
  fit_for_height: boolean;
  fit_for_confined_space: boolean;
  doctor_name?: string | null;
  document_url?: string | null;
  created_at?: string | null;
  worker?: Worker;
}

export interface DisciplinaryRecord {
  id: string;
  worker_id: string;
  type: DisciplinaryType;
  title: string;
  content_html: string;
  applied_by?: string | null;
  applied_at: string;
  pdf_url?: string | null;
  worker?: Worker;
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
  tracking_code?: string;
  assigned_at: string;
  returned_at: string | null;
  condition_on_return: string | null;
  digital_signature_url: string | null;
  return_signature_url?: string | null;
  generated_pdf_url: string | null;
  audit_selfie_url?: string | null;
  unit_price_at_delivery?: number;
  evidence_type?: string | null;
  biometric_match_score?: number | null;
  liveness_verified?: boolean | null;
  expected_return_date: string | null;
  catalog?: EpiCatalog;
  worker?: Worker;
  epi?: EpiCatalog;
}
