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
    ${h.extraerFuncion('mergeTextCopy')}
    ${h.extraerFuncion('mergeTexts')}
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
    /\[fixU10P110, fixU10P111, fixU10P109Content, fixU10P110Content, fixU10P111Content, fixU10P112Content, fixU10P109Dupes, fixU10P113Content, fixU10P109Kids,[\w\s,]*?fixU9Pages, fixU9P97, fixU9P98, fixU9P99, fixU9P100, fixU9P101, fixU9P102, fixU9P103, fixU9P104,\s*fixU9P105, fixU9P106, fixU9P107, fixU9Phrasal[,\]]/);
  assert.match(fuente, /onchange="restorePagesFromBackup\(event\)"/);
});

// ---------------------------------------------------------------------------
// El ✅ de los textos. El 1 de octubre él marcó la p. 109 en un aparato; el
// otro ya había subido su copia sin marcar y, al traer la nube antes de subir,
// la copia de la nube ganó entera: la 109 se desmarcó sola.
// ---------------------------------------------------------------------------

const texto = (extra = {}) => ({ id: 'txt_u10_p109', title: 'U10 · pág 109', body: 'Let me think...', ...extra });

test('el ✅ que se acaba de marcar aquí no lo deshace una copia vieja de la nube', () => {
  const aqui = { units: {}, texts: [texto({ mastered: true, markedAt: 2000, review: { step: 0, due: '2026-10-02', last: '2026-10-01' } })] };
  const nube = { units: {}, texts: [texto({ mastered: false })] };
  const t = unir(aqui, nube).texts[0];
  assert.equal(t.mastered, true);
  assert.deepEqual(t.review, { step: 0, due: '2026-10-02', last: '2026-10-01' });
});

test('si lo marcó después en el otro aparato, gana el otro', () => {
  const aqui = { units: {}, texts: [texto({ mastered: true, markedAt: 1000, review: { step: 0, due: '2026-10-02' } })] };
  const nube = { units: {}, texts: [texto({ mastered: false, markedAt: 3000 })] };
  const t = unir(aqui, nube).texts[0];
  assert.equal(t.mastered, false);
  assert.equal(t.review, undefined, 'desmarcado allá: sin repaso');
});

test('lo demás del texto sigue viniendo de la nube', () => {
  const aqui = { units: {}, texts: [texto({ mastered: true, markedAt: 2000, lookups: {} })] };
  const nube = { units: {}, texts: [texto({ body: 'Texto editado en el otro aparato.', lookups: { think: 'pensar' } })] };
  const t = unir(aqui, nube).texts[0];
  assert.equal(t.body, 'Texto editado en el otro aparato.');
  assert.deepEqual(t.lookups, { think: 'pensar' });
  assert.equal(t.mastered, true);
});

test('marcar y repasar dejan la hora, que es lo que mira la unión', () => {
  assert.match(h.extraerFuncion('toggleTextMastered'), /t\.markedAt = Date\.now\(\);/);
  assert.match(h.extraerFuncion('markTextReview'), /t\.markedAt = Date\.now\(\);/);
  assert.match(funcionDeVentana('_mergeCloudState'), /state\.texts = mergeTexts\(localTexts, imported\.texts\);/);
});

// ---------------------------------------------------------------------------
// Fotos agregadas a mano (2 de octubre). Con el computador abierto, la nube
// trae su copia de las páginas: el número que él escribió en el celular al
// ponerle la foto no puede perderse porque el otro aparato subió antes.
// ---------------------------------------------------------------------------

test('el número de página escrito a mano en este aparato no lo borra la copia de la nube', () => {
  const celular = { units: { a2_1: { batches: [lote('b1', { images: ['foto'], pages: [5], pagesByHand: true }), lote('b2', { pages: [97] })] } } };
  const nube = { units: { a2_1: { batches: [lote('b1'), lote('b2', { pages: [98] })] } } };
  const r = unir(celular, nube);
  const [b1, b2] = r.units.a2_1.batches;
  assert.deepEqual([b1.images, b1.pages, b1.pagesByHand], [['foto'], [5], true]);
  assert.deepEqual(b2.pages, [98], 'un número que no escribió él sigue viniendo de la nube');
});

// Unit 1 (respaldo del 2 de octubre): numeró las 11 fotos del 1 al 11, salió,
// volvió a entrar y los números eran los de antes. La nube traía su copia
// vieja del lote entero. Ahora cada número escrito lleva su hora y gana el más
// reciente, venga de donde venga.
test('el número escrito más reciente gana, venga de la nube o de este aparato', () => {
  const celular = { units: { a2_1: { batches: [
    lote('b1', { images: ['foto'], pages: [2], pagesByHand: true, pagesAt: 200 }),
    lote('b2', { pagesAt: 200 }),
    lote('b3', { pages: [7], pagesByHand: true, pagesAt: 100 }),
  ] } } };
  const nube = { units: { a2_1: { batches: [
    lote('b1', { pages: [10], pagesByHand: true, pagesAt: 50 }),
    lote('b2', { pages: [4], pagesByHand: true, pagesAt: 50 }),
    lote('b3', { pages: [8], pagesByHand: true, pagesAt: 300 }),
  ] } } };
  const [b1, b2, b3] = unir(celular, nube).units.a2_1.batches;
  assert.deepEqual([b1.images, b1.pages, b1.pagesAt], [['foto'], [2], 200], 'la copia vieja de la nube no lo pisa');
  assert.deepEqual([b2.pages, b2.pagesByHand, b2.pagesAt], [undefined, undefined, 200], 'quitar el número también es más reciente');
  assert.deepEqual([b3.pages, b3.pagesAt], [[8], 300], 'si lo cambió después en el otro aparato, gana ese');
});

test('la nube sin hora no pisa un número con hora', () => {
  const celular = { units: { a2_1: { batches: [lote('b1', { pages: [3], pagesByHand: true, pagesAt: 10 })] } } };
  const nube = { units: { a2_1: { batches: [lote('b1', { pages: [1] })] } } };
  assert.deepEqual(unir(celular, nube).units.a2_1.batches[0].pages, [3]);
});
