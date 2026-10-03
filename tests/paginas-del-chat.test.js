/**
 * La segunda forma de subir páginas: él manda las fotos al chat, Claude arma
 * las páginas en un archivo con forma de respaldo, y "Restore missing pages
 * from a backup" las agrega sin gastar la API. Para el B1, la unidad todavía
 * no existe: la restauración la crea, con su título y descripción.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { missingBatchesFromBackup } = h.ejecutar(`
  ${h.extraerFuncion('allBatchIds')}
  ${h.extraerFuncion('missingBatchesFromBackup')}
  return { missingBatchesFromBackup };`, {});

const paquete = { units: { b1_1: { lid: 'b1', uid: 1, title: 'Unit 1', description: 'La primera del B1.',
  batches: [{ id: 'b_chat_1', pages: [1], images: ['data:image/jpeg;base64,AAAA'], vocab: [{ word: 'w' }], grammar: [{ title: 'g' }] }] } } };

test('una página de una unidad que no existe en el aparato cuenta como faltante', () => {
  const aqui = { units: { a2_10: { batches: [{ id: 'b_a' }] } }, deletedBatchIds: [] };
  assert.deepEqual(missingBatchesFromBackup(aqui, paquete).map(f => [f.unit.lid, f.unit.uid, f.batch.id]), [['b1', 1, 'b_chat_1']]);
  assert.deepEqual(missingBatchesFromBackup({ units: { b1_1: { batches: [{ id: 'b_chat_1' }] } } }, paquete), [], 'ya está: nada');
  assert.deepEqual(missingBatchesFromBackup({ units: {}, deletedBatchIds: ['b_chat_1'] }, paquete), [], 'la borró él: no vuelve');
});

test('la restauración crea la unidad con su título y descripción, y dice el nivel', () => {
  const restaurar = h.extraerFuncion('restorePagesFromBackup');
  assert.match(restaurar, /const u = getUnit\(bu\.lid, bu\.uid\);/);
  assert.match(restaurar, /if \(!u\.title && bu\.title\) u\.title = bu\.title;/);
  assert.match(restaurar, /if \(!u\.description && bu\.description\) u\.description = bu\.description;/);
  assert.match(restaurar, /String\(f\.unit\.lid \|\| ''\)\.toUpperCase\(\)/);
  // getUnit crea la unidad que no existe, con su nivel y número.
  const getUnit = h.extraerFuncion('getUnit');
  assert.match(getUnit, /if \(!state\.units\[key\]\) \{\s*state\.units\[key\] = \{\s*lid, uid, key,/);
});
