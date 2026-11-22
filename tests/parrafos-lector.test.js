/**
 * Bloques en el lector: respetar los renglones en blanco.
 *
 * El lector lee frase por frase, así que los renglones en blanco que separan
 * los bloques se perdían y todo se veía como un solo párrafo (Dev escribe sus
 * guiones de TikTok por bloques). `paragraphStarts` marca qué frase empieza un
 * bloque, calculándolo sobre las MISMAS frases que ya usa el lector, para no
 * cambiar el conteo ni el emparejado con la traducción.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { splitSentences, paragraphStarts } = h.ejecutar(`
  ${h.extraerFuncion('splitSentences')}
  ${h.extraerFuncion('paragraphStarts')}
  return { splitSentences, paragraphStarts };`, {});

const starts = body => [...paragraphStarts(body, splitSentences(body))].sort((a, b) => a - b);

test('un renglón en blanco abre bloque; la primera frase nunca cuenta', () => {
  // frases: [One., Two., Three., Four., Five.] (0..4)
  assert.deepEqual(starts('One. Two.\n\nThree. Four.\n\nFive.'), [2, 4]);
});

test('sin renglón en blanco, no hay saltos', () => {
  assert.deepEqual(starts('One. Two. Three.'), []);
});

test('un solo salto entre líneas (sin renglón vacío) no abre bloque', () => {
  // Un único \n no separa bloques: tiene que haber un renglón en blanco.
  assert.deepEqual(starts('One.\nTwo.'), []);
});

test('no cambia el conteo de frases que lee el audio', () => {
  assert.equal(splitSentences('One. Two.\n\nThree.').length, 3);
});

test('el guion de TikTok se ve en sus seis bloques', () => {
  const fuente = h.fuente();
  const ini = fuente.indexOf('    const seed = [');
  const fin = fuente.indexOf('\n    ];\n', ini);
  const semilla = h.ejecutar(`return ${fuente.slice(ini + '    const seed = '.length, fin + 6)};`, {});
  const t = semilla.find(x => x.id === 'txt_tiktok2');
  assert.ok(t, 'falta txt_tiktok2');
  // Cinco saltos = seis bloques, en los límites que él escribió (video 2 corto).
  assert.deepEqual(starts(t.body), [2, 3, 7, 8, 11]);
});

test('el lector pide los saltos de bloque al abrir el texto', () => {
  const fuente = h.fuente();
  assert.match(fuente, /paraStart: paragraphStarts\(t\.body, sentences\),/);
  // Y solo pinta la separación donde empieza bloque.
  assert.match(fuente, /const pre = \(st\.paraStart && st\.paraStart\.has\(si\)\)/);
});
