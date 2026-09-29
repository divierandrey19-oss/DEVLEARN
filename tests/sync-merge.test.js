/**
 * Sincronizar el celular y el computador sin perder páginas.
 *
 * Lo que pasó el 29 de septiembre: él subió la p. 111 en el celular mientras
 * el computador tenía la app abierta desde antes. El computador subió su copia
 * vieja entera (sin la p. 111) encima de la nube. Al abrir el celular, la
 * unión vio que la p. 111 "estaba en la nube antes y ya no" y la tomó por
 * borrada en otro aparato: la quitó también del celular.
 *
 * Ahora: una página solo se borra al sincronizar si él la borró a propósito
 * (deletedBatchIds); cada aparato trae la nube antes de subir; y hay una forma
 * de recuperar páginas perdidas desde un respaldo sin reemplazar lo demás.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

/** Recorta `window.NOMBRE = function(...) {...};` del código. */
function funcionDeVentana(nombre) {
  const ini = fuente.indexOf(`window.${nombre} = function(`);
  assert.ok(ini > 0, `no se encontró window.${nombre}`);
  const fin = fuente.indexOf('\n};\n', ini);
  return fuente.slice(ini, fin + 3);
}

function unir(local, nube) {
  const state = JSON.parse(JSON.stringify(local));
  const window = {};
  h.ejecutar(`
    ${h.extraerFuncion('allBatchIds')}
    ${h.extraerFuncion('mergeFcProgress')}
    ${funcionDeVentana('_mergeCloudState')}
    window._mergeCloudState(nube);
  `, {
    state, window, nube: JSON.parse(JSON.stringify(nube)),
    migrateState: s => ({ deletedBatchIds: [], ...s }),
    computeStreak: () => 0, healUnitTitles: () => {}, saveNow: () => {},
    document: { querySelector: () => null }, current: {}, console,
  });
  return state;
}

const lote = (id, extra = {}) => ({ id, images: [], vocab: [{ word: id }], ...extra });
const ids = st => st.units.a2_10.batches.map(b => b.id);

test('una copia vieja subida por el otro aparato ya no borra la página nueva', () => {
  // El celular subió la p. 111 y la nube la tuvo (syncedBatchIds); después el
  // computador subió su copia vieja sin ella.
  const celular = { units: { a2_10: { lid: 'a2', uid: 10, batches: [lote('p109'), lote('p110'), lote('p111', { images: ['foto'] })] } },
                    syncedBatchIds: ['p109', 'p110', 'p111'] };
  const nube = { units: { a2_10: { lid: 'a2', uid: 10, batches: [lote('p109'), lote('p110')] } } };
  const r = unir(celular, nube);
  assert.deepEqual(ids(r), ['p109', 'p110', 'p111']);
  assert.deepEqual(r.units.a2_10.batches[2].images, ['foto'], 'con su foto');
});

test('una página borrada a propósito en el otro aparato sí se va', () => {
  const celular = { units: { a2_10: { batches: [lote('p109'), lote('p110')] } } };
  const nube = { units: { a2_10: { batches: [lote('p109')] } }, deletedBatchIds: ['p110'] };
  const r = unir(celular, nube);
  assert.deepEqual(ids(r), ['p109']);
  assert.deepEqual(r.deletedBatchIds, ['p110'], 'y el registro del borrado se conserva');
});

test('lo borrado aquí no vuelve desde la nube, y los registros se juntan', () => {
  const celular = { units: { a2_10: { batches: [lote('p109')] } }, deletedBatchIds: ['p108'] };
  const nube = { units: { a2_10: { batches: [lote('p108'), lote('p109')] } }, deletedBatchIds: ['p100'] };
  const r = unir(celular, nube);
  assert.deepEqual(ids(r), ['p109']);
  assert.deepEqual([...r.deletedBatchIds].sort(), ['p100', 'p108']);
});

test('una página que solo tiene la nube llega a este aparato', () => {
  const computador = { units: { a2_10: { batches: [lote('p109'), lote('p110')] } } };
  const nube = { units: { a2_10: { batches: [lote('p109'), lote('p110'), lote('p111')] } } };
  assert.deepEqual(ids(unir(computador, nube)), ['p109', 'p110', 'p111']);
});

test('antes de subir, cada aparato trae la nube y la junta si alguien subió después', () => {
  const push = fuente.slice(fuente.indexOf('window._syncToFirestoreNow = async function()'),
                            fuente.indexOf('let _unsubscribeListener = null;'));
  const leer = push.indexOf('const actual = await window._fb.getDoc(ref);');
  const escribir = push.indexOf('await window._fb.setDoc(ref, payload);');
  assert.ok(leer > 0 && escribir > leer, 'lee antes de escribir');
  assert.match(push, /if \(actual\.exists\(\) && cloudMillis\(actual\.data\(\)\) > \(state\.lastCloudSeen \|\| 0\)\) \{\s*const cloud = await _readCloudState\(actual\.data\(\)\);\s*window\._mergeCloudState && window\._mergeCloudState\(cloud\);/);
  assert.ok(push.indexOf('const s = getStateForSync();') > leer, 'sube el estado ya unido');
});

test('al volver a una pestaña abierta, trae lo nuevo del otro aparato', () => {
  assert.match(fuente, /document\.addEventListener\('visibilitychange', \(\) => \{\s*if \(document\.visibilityState === 'visible'\) window\._pullIfNewer\(\);/);
});

test('borrar una foto o reiniciar la unidad deja el registro del borrado', () => {
  assert.match(fuente, /if \(batchIdx >= 0\) u\.batches\.splice\(batchIdx, 1\);\s*recordDeletedBatches\(\[batch\.id\]\);/);
  const reset = h.extraerFuncion('doReset');
  assert.match(reset, /recordDeletedBatches\(u\.batches\.map\(b => b\.id\)\);\s*u\.batches = \[\];/);
  assert.match(reset, /recordDeletedBatches\(u\.batches\.filter\(vacio\)\.map\(b => b\.id\)\);/);
});

test('recuperar desde un respaldo: solo lo que falta y no fue borrado a propósito', () => {
  const { missingBatchesFromBackup } = h.ejecutar(`
    ${h.extraerFuncion('allBatchIds')}
    ${h.extraerFuncion('missingBatchesFromBackup')}
    return { missingBatchesFromBackup };
  `, {});
  const aqui = { units: { a2_10: { batches: [lote('p109'), lote('p110')] } }, deletedBatchIds: ['p105'] };
  const respaldo = { units: { a2_10: { lid: 'a2', uid: 10, batches: [lote('p105'), lote('p109'), lote('p110'), lote('p111')] } } };
  assert.deepEqual(missingBatchesFromBackup(aqui, respaldo).map(f => f.batch.id), ['p111']);
  assert.deepEqual(missingBatchesFromBackup(aqui, { units: {} }), []);
});

test('la página recuperada recibe también sus correcciones a mano', () => {
  const restaurar = h.extraerFuncion('restorePagesFromBackup');
  assert.match(restaurar, /applyPageFixes\(state\.units\);/);
  assert.match(h.extraerFuncion('applyPageFixes'),
    /\[fixU10P110, fixU10P111, fixU10P109Content, fixU10P110Content, fixU10P111Content, fixU10P112Content, fixU10P109Dupes\]/);
  assert.match(fuente, /onchange="restorePagesFromBackup\(event\)"/);
});
