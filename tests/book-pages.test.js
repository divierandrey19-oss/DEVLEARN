/**
 * Las páginas se llaman como en su libro: "p. 109", no "Page 1".
 *
 * Él pidió que cada foto que sube se llame con el número impreso abajo en la
 * página del libro. La IA lo lee al analizar la foto; lo que se revisa aquí es
 * que un número raro no entre, y que el nombre salga bien.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { sanitizePageNumbers, bookPageLabel, batchLabel } = h.ejecutar(`
  ${h.extraerFuncion('sanitizePageNumbers')}
  ${h.extraerFuncion('bookPageLabel')}
  ${h.extraerFuncion('batchLabel')}
  return { sanitizePageNumbers, bookPageLabel, batchLabel };
`, {});

test('solo entran números de página razonables, en orden y sin repetir', () => {
  assert.deepEqual(sanitizePageNumbers([110, '109', 109]), [109, 110]);
  assert.deepEqual(sanitizePageNumbers(['p. 104']), [104]);
  assert.deepEqual(sanitizePageNumbers([0, -3, 4000, 'abc', null]), []);
  assert.deepEqual(sanitizePageNumbers(109), [109], 'un número suelto también sirve');
  assert.deepEqual(sanitizePageNumbers(undefined), []);
});

test('el nombre sale como en el libro', () => {
  assert.equal(bookPageLabel({ pages: [109] }), 'p. 109');
  assert.equal(bookPageLabel({ pages: [104, 105] }), 'pp. 104–105');
  assert.equal(bookPageLabel({ pages: [104, 106] }), 'pp. 104, 106');
  assert.equal(bookPageLabel({}), '', 'sin número, no inventa uno');
});

test('con número de libro, la página se llama así; sin él, sigue como antes', () => {
  const u = { batches: [
    { id: 'a', images: ['x'] },
    { id: 'b', images: ['y'], pages: [109] },
    { id: 'c', images: [], title: 'Phrasal verbs — Unit 9' },
  ] };
  assert.equal(batchLabel(u, 'b'), 'p. 109');
  assert.equal(batchLabel(u, 'a'), 'Page 1', 'las que subió antes no cambian');
  assert.equal(batchLabel(u, 'c'), 'Phrasal verbs — Unit 9');
});

test('el análisis de la página pide el número y lo guarda', () => {
  const fuente = h.fuente();
  assert.match(fuente, /"pageNumbers": "array of the page numbers PRINTED on the photos/);
  assert.match(fuente, /const paginas = sanitizePageNumbers\(parsed\.pageNumbers\);\s*if \(paginas\.length\) batch\.pages = paginas;/);
});
