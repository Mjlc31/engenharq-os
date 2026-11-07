// Autoteste das regras do telão. Rodar: node scripts/test_kds_tv.ts
import assert from 'node:assert/strict';
import { publicName, slaLevel, formatElapsed } from '../src/lib/kdsTv.ts';

assert.equal(publicName('THIAGO HENRIQUE LIMA DA SILVA'), 'Thiago S.');
assert.equal(publicName('Colaborador Teste QA'), 'Colaborador Q.');
assert.equal(publicName('maria'), 'Maria');
assert.equal(publicName('JOÃO DOS'), 'João');        // só partícula depois do nome
assert.equal(publicName('  ana   de  souza  '), 'Ana S.');
assert.equal(publicName(''), 'Colaborador');
assert.equal(publicName(null), 'Colaborador');

assert.equal(slaLevel(0), 'ok');
assert.equal(slaLevel(180), 'ok');
assert.equal(slaLevel(181), 'warning');
assert.equal(slaLevel(300), 'warning');
assert.equal(slaLevel(301), 'late');

assert.equal(formatElapsed(0), '00:00');
assert.equal(formatElapsed(65), '01:05');
assert.equal(formatElapsed(-5), '00:00');
assert.equal(formatElapsed(3600), '60:00');

console.log('kds-tv: ok');
