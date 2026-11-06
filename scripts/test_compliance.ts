// Autoteste das pendências do Dashboard. Rodar: node scripts/test_compliance.ts
import assert from 'node:assert/strict';
import { computeCompliance } from '../src/lib/compliance.ts';

const today = new Date(2026, 10, 6); // 06/11/2026

const result = computeCompliance({
  today,
  catalogs: [
    { name: 'Capacete', ca_validity: '2026-11-05', current_stock: 0, minimum_stock: 5 }, // CA vencido ontem, esgotado
    { name: 'Luva', ca_validity: '2026-11-06', current_stock: 3, minimum_stock: 5 },     // vence hoje, abaixo do mínimo
    { name: 'Bota', ca_validity: '2026-12-06', current_stock: 20, minimum_stock: 5 },    // vence em 30 dias
    { name: 'Óculos', ca_validity: '2026-12-07', current_stock: 20, min_stock: 5 },      // 31 dias: ok
    { name: 'Protetor', ca_validity: null, current_stock: 10 },                          // sem mínimo: padrão 10, conta como baixo
  ],
  workers: [
    { id: 'a', status: 'ACTIVE' },
    { id: 'b', status: null },      // sem status = ativo
    { id: 'c', status: 'ATIVO' },
    { id: 'd', status: 'INACTIVE' },
  ],
  asos: [
    { worker_id: 'a', valid_until: '2025-01-01' }, // antigo vencido...
    { worker_id: 'a', valid_until: '2027-01-01' }, // ...mas o mais recente é válido
    { worker_id: 'b', valid_until: '2026-11-20' }, // vencendo
    { worker_id: 'd', valid_until: '2020-01-01' }, // inativo: ignorado
    // 'c' sem ASO
  ],
  trainings: [
    { worker_id: 'a', training_id: 'nr35', valid_until: '2026-10-01' }, // vencido
    { worker_id: 'a', training_id: 'nr33', valid_until: '2026-11-30' }, // vencendo
    { worker_id: 'b', training_id: 'nr35', valid_until: '2026-01-01' },
    { worker_id: 'b', training_id: 'nr35', valid_until: '2027-06-01' }, // renovado: ok
    { worker_id: 'd', training_id: 'nr35', valid_until: '2020-01-01' }, // inativo: ignorado
  ],
});

assert.deepEqual(result.ca, { expired: 1, expiring: 2, names: ['Capacete', 'Luva', 'Bota'] });
assert.deepEqual(result.aso, { expired: 0, expiring: 1, missing: 1 });
assert.deepEqual(result.trainings, { expired: 1, expiring: 1 });
assert.deepEqual(result.stock, { out: 1, low: 2, names: ['Capacete', 'Luva', 'Protetor'] });

console.log('compliance: ok');
