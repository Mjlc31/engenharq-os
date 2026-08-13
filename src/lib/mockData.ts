import { EpiInventory, Worker, ConstructionSite, EpiAssignment } from '../types';

export const mockEpis: EpiInventory[] = [
  { id: '1', category: 'Capacete de Segurança classe B', tracking_code: 'CAP01', ca_number: '31469', status: 'AVAILABLE', size: 'Único', ca_expiration_date: null, recommended_lifespan_days: 180, created_at: new Date().toISOString() },
  { id: '2', category: 'Capacete de Segurança classe B', tracking_code: 'CAP02', ca_number: '31469', status: 'IN_USE', size: 'Único', ca_expiration_date: null, recommended_lifespan_days: 180, created_at: new Date().toISOString() },
  { id: '3', category: 'Luva de Vaqueta', tracking_code: 'LUV01', ca_number: '12345', status: 'AVAILABLE', size: 'M', ca_expiration_date: null, recommended_lifespan_days: 90, created_at: new Date().toISOString() },
  { id: '4', category: 'Cinto de Segurança tipo Paraquedista', tracking_code: 'CIN01', ca_number: '98765', status: 'MAINTENANCE', size: 'G', ca_expiration_date: null, recommended_lifespan_days: 365, created_at: new Date().toISOString() },
];

export const mockWorkers: Worker[] = [
  { id: 'w1', full_name: 'João Silva', cpf: '111.222.333-44', registration_number: 'MAT123', current_site_id: 's1', created_at: new Date().toISOString() },
  { id: 'w2', full_name: 'Maria Costa', cpf: '555.666.777-88', registration_number: 'MAT456', current_site_id: 's1', created_at: new Date().toISOString() },
  { id: 'w3', full_name: 'Carlos Oliveira', cpf: '999.888.777-66', registration_number: 'MAT789', current_site_id: 's2', created_at: new Date().toISOString() },
];

export const mockSites: ConstructionSite[] = [
  { id: 's1', name: 'Canteiro Principal Alpha', latitude: -9.6658, longitude: -35.7351, created_at: new Date().toISOString() },
  { id: 's2', name: 'Obras Metrô Linha 6', latitude: -9.6500, longitude: -35.7200, created_at: new Date().toISOString() },
];

export const mockAssignments: EpiAssignment[] = [
  { id: 'a1', epi_id: '2', worker_id: 'w1', assigned_at: new Date().toISOString(), expected_return_date: new Date(Date.now() + 86400000 * 180).toISOString(), condition_on_return: null, digital_signature_url: null, generated_pdf_url: null, returned_at: null, epi: mockEpis[1], worker: mockWorkers[0] }
];
