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
  // En las páginas que faltan (unidad nueva) y en las que se llenan.
  assert.match(restaurar, /if \(!u\.description && bu\.description\) u\.description = bu\.description;\n\s*\}\);/);
  assert.match(restaurar, /if \(!u\.description && bu\.description\) u\.description = bu\.description;\n\s*ordenar\.add\(unitKey\);/);
  assert.match(restaurar, /String\(f\.unit\.lid \|\| ''\)\.toUpperCase\(\)/);
  // getUnit crea la unidad que no existe, con su nivel y número.
  const getUnit = h.extraerFuncion('getUnit');
  assert.match(getUnit, /if \(!state\.units\[key\]\) \{\s*state\.units\[key\] = \{\s*lid, uid, key,/);
});

// ── Fotos subidas "para Claude": vacías aquí, llenas en el archivo ─────────

const llenado = h.ejecutar(`
  ${h.extraerFuncion('emptyBatchesToFill')}
  ${h.extraerFuncion('fillEmptyBatch')}
  return { emptyBatchesToFill, fillEmptyBatch };`, {});

const vacia = id => ({ id, images: ['data:image/jpeg;base64,FOTO'], vocab: [], grammar: [], exercises: [], speakingPrompts: [], paraClaude: true });
const llena = (id, pagina) => ({ id, pages: [pagina], title: `p. ${pagina}`, grammarVersion: 3, generatedAt: 5,
  vocab: [{ word: `w${pagina}` }], grammar: [{ title: 'g' }], exercises: [{ question: 'q' }], speakingPrompts: ['s'] });

test('las fotos "para Claude" vacías se llenan con el archivo; las que tienen contenido, no', () => {
  const aqui = { units: { b1_1: { batches: [vacia('f1'), vacia('f2'), { id: 'ya', vocab: [{ word: 'x' }], grammar: [] }, { ...vacia('analizando'), analyzing: true }] } } };
  const archivo = { units: { b1_1: { lid: 'b1', uid: 1, batches: [llena('f1', 3), llena('f2', 1), llena('ya', 2), llena('analizando', 4), { id: 'f3', vocab: [] }] } } };
  assert.deepEqual(llenado.emptyBatchesToFill(aqui, archivo).map(f => f.batch.id), ['f1', 'f2'],
    'no la que ya tiene tarjetas (su progreso), ni la que se está analizando, ni una vacía en el archivo');
});

test('llenar: entra todo, también tarjetas y número; la foto de aquí se queda', () => {
  const b = llenado.fillEmptyBatch(vacia('f1'), llena('f1', 3));
  assert.deepEqual(b.pages, [3]);
  assert.ok(b.pagesAt > 0, 'con hora, para que la copia vacía de la nube no le quite el número');
  assert.deepEqual(b.vocab, [{ word: 'w3' }]);
  assert.deepEqual(b.speakingPrompts, ['s']);
  assert.deepEqual(b.images, ['data:image/jpeg;base64,FOTO']);
  assert.equal(b.paraClaude, undefined);
});

test('el botón guarda cada foto como su página, vacía, sin API; la restauración las llena y las ordena', () => {
  const fuente = h.fuente();
  assert.match(fuente, /onchange="handlePhotosForClaude\(event\)"/);
  const subir = h.extraerFuncion('handlePhotosForClaude');
  assert.match(subir, /images: \[img\], vocab: \[\], grammar: \[\]/);
  assert.match(subir, /grammarVersion: GRAMMAR_VERSION, paraClaude: true/);
  assert.doesNotMatch(subir, /analyzeWithAI|analyzeContent/, 'no gasta la API');
  const restaurar = h.extraerFuncion('restorePagesFromBackup');
  assert.match(restaurar, /const llenar = emptyBatchesToFill\(state, backup\);/);
  assert.match(restaurar, /newerContentFromBackup\(state, backup\)\.filter\(f => !porLlenar\.has\(f\.batch\.id\)\)/);
  assert.match(restaurar, /fillEmptyBatch\(aqui, batch\);/);
  assert.match(restaurar, /ordenar\.forEach\(k => ordenarPorPagina\(state\.units, k\)\);/);
});
