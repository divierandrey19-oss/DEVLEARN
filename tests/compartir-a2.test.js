/**
 * Compartir el A2 con una compañera (8 de octubre): él le pasa un archivo con
 * las 112 páginas de las Units 1-10, sin progreso ni fotos, y ella lo carga en
 * Settings → "Restore missing pages from a backup". Dos cosas lo impedían:
 *
 * - El aviso listaba las 112 páginas una por una y el botón "Restore" quedaba
 *   fuera de la pantalla, sin forma de llegar a él.
 * - Al recargar, los phrasal verbs de las Units 7-9 entraban otra vez (59
 *   tarjetas repetidas): el de la Unit 9 se renombró, y solo se miraba el título.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { listaDePaginas } = h.ejecutar(`${h.extraerFuncion('listaDePaginas')} return { listaDePaginas };`, {});
const pagina = (uid, n) => ({ unit: { lid: 'a2', uid }, batch: { pages: [n] } });
const nombre = f => `A2 Unit ${f.unit.uid} · p. ${f.batch.pages[0]}`;

test('pocas páginas: una por línea, como siempre', () => {
  assert.deepEqual(listaDePaginas([pagina(10, 116), pagina(10, 117)], nombre), ['A2 Unit 10 · p. 116', 'A2 Unit 10 · p. 117']);
});

test('muchas páginas: por unidad, en el orden en que llegan', () => {
  const muchas = [...Array.from({ length: 11 }, (_, i) => pagina(1, i + 1)), ...Array.from({ length: 12 }, (_, i) => pagina(7, 73 + i)), pagina(9, 97)];
  assert.deepEqual(listaDePaginas(muchas, nombre), ['A2 Unit 1 — 11 pages', 'A2 Unit 7 — 12 pages', 'A2 Unit 9 — 1 page']);
});

test('el aviso se puede desplazar, y la restauración usa la lista agrupada', () => {
  assert.match(h.fuente(), /<div id="confirm-message" style="[^"]*max-height:55vh;overflow-y:auto;">/);
  const restaurar = h.extraerFuncion('restorePagesFromBackup');
  assert.match(restaurar, /const lista = items => listaDePaginas\(items, nombre\)\.join\('\\n• '\);/);
  assert.doesNotMatch(restaurar, /\.map\(nombre\)\.join/);
});

test('los phrasal verbs no entran dos veces: se reconocen por título o por id', () => {
  assert.match(h.extraerFuncion('migrateState'), /u\.batches\.some\(b => b && \(b\.title === PV\[key\]\.title \|\| b\.id === 'pv_' \+ key\)\)/);
});

// ── Sus textos, solo en sus aparatos (8 de octubre) ───────────────────────

test('los textos que él memoriza solo se siembran en un aparato que ya los tenía', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /const aparatoSuyo = \(merged\._u7SeedVersion \|\| 0\) > 0 \|\| merged\._u7TextsSeeded === true;/);
  assert.match(migrar, /if \(aparatoSuyo && \(merged\._u7SeedVersion \|\| 0\) < SEED_VERSION\) \{/);
});

test('un aparato suyo nuevo trae la bandera de la nube, con todo lo de arriba', () => {
  // La unión con la nube copia los campos de arriba (entre ellos _u7SeedVersion)
  // y junta los textos: así su aparato nuevo sigue recibiendo los textos nuevos.
  const fuente = h.fuente();
  assert.match(fuente, /Object\.keys\(imported\)\.forEach\(function\(k\) \{ state\[k\] = imported\[k\]; \}\);/);
  assert.match(fuente, /state\.texts = mergeTexts\(localTexts, imported\.texts\);/);
});
