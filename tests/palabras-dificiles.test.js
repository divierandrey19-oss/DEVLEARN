/**
 * Al final de Flashcards, la lista de las palabras que más falla (4 de
 * octubre): palabra, 🔊, cómo se pronuncia y traducción, para inventarles una
 * asociación (la técnica de las "asociaciones inverosímiles"). Desde 2 fallos;
 * con 3 ya son "difficult" y salen en ámbar.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const f = h.ejecutar(`${['getUnitVocab', 'escapeHtml', 'palabrasDificiles', 'renderPalabrasDificiles'].map(n => h.extraerFuncion(n)).join('\n')}
  return { palabrasDificiles, renderPalabrasDificiles };`, {});

const w = (word, extra = {}) => ({ word, translation: `t-${word}`, phonetic: `/${word}/`, ...extra });
const units = {
  a2_9: { lid: 'a2', uid: 9, batches: [{ vocab: [w('by any chance'), w('walk in'), w('paddle'), w('kayak')] }, { vocab: [w('walk in')] }],
          fcProgress: { 'by any chance': { lapses: 7 }, 'walk in': { lapses: 4 }, paddle: { lapses: 2 }, kayak: { lapses: 1 } } },
  a2_5: { lid: 'a2', uid: 5, batches: [{ vocab: [w('at least'), w('a meat and potatoes man')] }],
          fcProgress: { 'at least': { lapses: 2 }, 'a meat and potatoes man': { lapses: 3 }, borrada: { lapses: 9 } } },
  a2_10: { lid: 'a2', uid: 10, batches: [{ vocab: [w('go the extra mile')] }], fcProgress: {} },
};

test('desde 2 fallos, la que más falla primero; sin repetidas ni tarjetas que ya no existen', () => {
  const lista = f.palabrasDificiles(units);
  assert.deepEqual(lista.map(x => [x.word.word, x.lapses, x.unit.uid]), [
    ['by any chance', 7, 9], ['walk in', 4, 9], ['a meat and potatoes man', 3, 5], ['at least', 2, 5], ['paddle', 2, 9]]);
  assert.equal(f.palabrasDificiles(units, 2, 2).length, 2, 'con tope');
  assert.deepEqual(f.palabrasDificiles({}), []);
  assert.deepEqual(f.palabrasDificiles(undefined), []);
});

test('cada fila: palabra con 🔊, pronunciación, traducción, fallos y unidad; las difíciles en ámbar', () => {
  const html = f.renderPalabrasDificiles(f.palabrasDificiles(units));
  assert.match(html, /Words you miss most/);
  assert.match(html, /<div class="fc-hard-row leech">\s*<button class="audio-btn" onclick="speak\(this\.dataset\.say\)" data-say="by any chance"/);
  assert.match(html, /by any chance<span class="fc-hard-ipa">\/by any chance\/<\/span>/);
  assert.match(html, /t-by any chance/);
  assert.match(html, /<b>✗ 7<\/b>Unit 9/);
  assert.match(html, /<div class="fc-hard-row">\s*<button[^>]*data-say="paddle"/, 'con 2 fallos, sin ámbar');
  assert.equal(f.renderPalabrasDificiles([]), '', 'sin palabras falladas, no se muestra nada');
  const raro = f.renderPalabrasDificiles([{ word: { word: `don't <b>`, translation: 'x' }, unit: { uid: 1 }, lapses: 2 }]);
  assert.match(raro, /data-say="don&#39;t &lt;b&gt;"/);
  assert.doesNotMatch(raro, /fc-hard-ipa/, 'sin pronunciación guardada, no se inventa');
});

test('sale al final de la página de Flashcards', () => {
  const pagina = h.extraerFuncion('renderAllFlashcards');
  assert.match(pagina, /html \+= renderPalabrasDificiles\(palabrasDificiles\(state\.units\)\);\n\s*c\.innerHTML = html;/);
});
