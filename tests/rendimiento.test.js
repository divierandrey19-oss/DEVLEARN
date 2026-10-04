/**
 * La app se sentía lenta (2 de octubre). Con sus datos reales (diez unidades,
 * ~2900 palabras, 2,5 MB de estado) y la CPU de un celular de gama media:
 *
 * - Cada apertura guardaba el estado entero, casi un segundo congelada, porque
 *   setTheme y setLang guardaban aunque nada cambiara.
 * - Cada sincronización lo escribía dos veces más seguidas (la hora de la nube
 *   y los lotes que tiene), medio segundo cada una.
 * - La página Vocabulary dibujaba las ~2900 tarjetas de una vez: 4,4 segundos.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

function conDocumento(nombres) {
  const clases = { toggle() {} };
  const documento = { documentElement: { setAttribute() {} }, getElementById: () => ({ classList: { ...clases, contains: () => false } }) };
  const fuera = { guardados: 0 };
  const f = h.ejecutar(`${nombres.map(n => h.extraerFuncion(n)).join('\n')}
    return { ${nombres.join(', ')} };`, {
    document: documento, state: { theme: 'dark', lang: 'en' }, current: {},
    save: () => { fuera.guardados++; }, loadUnitContent() {}, renderAllVocab() {},
  });
  return { f, fuera };
}

test('abrir la app no guarda si el tema y el idioma son los mismos', () => {
  const { f, fuera } = conDocumento(['setTheme', 'setLang']);
  f.setTheme('dark');
  f.setLang('en');
  assert.equal(fuera.guardados, 0);
  f.setTheme('light');
  f.setLang('es');
  assert.equal(fuera.guardados, 2, 'cuando él lo cambia, sí se guarda');
});

test('la sincronización no escribe el estado entero de inmediato por su contabilidad', () => {
  const html = h.fuente();
  const cuerpo = nombre => {
    const i = html.indexOf(`window.${nombre} = function`);
    assert.ok(i >= 0, nombre);
    return html.slice(i, html.indexOf('\n};', i));
  };
  for (const n of ['_recordSyncedBatchIds', '_setCloudSeen']) {
    assert.match(cuerpo(n), /\bsave\(\);/, n);
    assert.doesNotMatch(cuerpo(n), /saveNow\(\)/, n);
  }
  // La fusión con la nube sí guarda enseguida: trae contenido nuevo.
  assert.match(cuerpo('_mergeCloudState'), /saveNow\(\)/);
  // La copia para subir, sin la copia completa de ida y vuelta.
  assert.doesNotMatch(h.extraerFuncion('getStateForSync'), /JSON\.parse\(JSON\.stringify/);
});

test('Vocabulary dibuja por tandas, y el buscador busca en todas', () => {
  const html = h.fuente();
  assert.match(h.extraerFuncion('filterAllVocab'), /appendVocabChunk\(grid, 0\)/);
  const tanda = Number((html.match(/const VOCAB_CHUNK = (\d+);/) || [])[1]);
  assert.ok(tanda > 0 && tanda <= 100, `tanda de ${tanda}`);

  // Una rejilla de mentira: cuenta lo que se agrega.
  const tarjetas = [];
  const grid = {
    querySelector: () => null,
    insertAdjacentHTML: (_, s) => { tarjetas.push(...(s.match(/class="vocab-card"/g) || [])); },
    appendChild() {},
  };
  const list = Array.from({ length: 2900 }, (_, i) => ({ word: `w${i}`, translation: 't', type: 'noun' }));
  const f = h.ejecutar(`${['appendVocabChunk', 'vocabCardHtml'].map(n => h.extraerFuncion(n)).join('\n')}
    const VOCAB_CHUNK = ${tanda};
    return { appendVocabChunk };`, {
    window: { _vocabList: list },
    document: { createElement: () => ({ style: {} }) },
    escapeHtml: s => s, escapeStr: s => s,
  });
  f.appendVocabChunk(grid, 0);
  assert.equal(tarjetas.length, tanda, 'al abrir, solo la primera tanda');
  f.appendVocabChunk(grid, tanda);
  assert.equal(tarjetas.length, 2 * tanda);
  f.appendVocabChunk(grid, 2900 - 10);
  assert.equal(tarjetas.length, 2 * tanda + 10, 'la última tanda llega hasta la última palabra');
});

// Un punto por palabra: con 359 palabras, la columna ocupaba toda la pantalla
// del celular (él lo pidió, 4 de octubre). Ahora es una barra delgada.
test('el progreso de la unidad es una barra, no un punto por palabra', () => {
  const vocab = h.extraerFuncion('renderVocabulary');
  assert.match(vocab, /class="mastery-track"/);
  assert.doesNotMatch(vocab, /word-dot|vocab-mastery-dots/);
  const tarjeta = h.extraerFuncion('renderFcUnitCard');
  assert.match(tarjeta, /class="mastery-track"/);
  assert.doesNotMatch(tarjeta, /word-dot|word-constellation/);
});
