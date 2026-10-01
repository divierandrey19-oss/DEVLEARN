/**
 * Las frases de podcast que él mandó por el chat ("¿y si las subes tú?").
 *
 * Van como una sesión de Podcasts ya completa —traducción, pronunciación y
 * ejemplo—, igual que las que él registra, y fuera de las unidades: sembrar
 * vocabulario dentro de una unidad bloquea las páginas que suba después
 * (CLAUDE.md). Se agregan una sola vez: si él borra la sesión, no vuelve.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const migrar = h.extraerFuncion('migrateState');
const ini = migrar.indexOf('  if (!merged._podPhrases20261001) {');
const fin = migrar.indexOf('\n  }\n', migrar.indexOf('\n    }\n', ini)) + 4;
const bloque = migrar.slice(ini, fin);

function sembrar(merged) {
  h.ejecutar(`${bloque}\nreturn merged;`, { merged });
  return merged;
}
const sesion = m => m.podcastLog.find(e => e.id === 'pod_phrases_20261001');

test('las frases quedan como una sesión de Podcasts, completas', () => {
  assert.ok(ini > 0, 'no se encontró la siembra en migrateState');
  const m = sembrar({ podcastLog: [] });
  const s = sesion(m);
  assert.ok(s, 'falta la sesión');
  assert.deepEqual(s.words.map(w => w.word), [
    'How close are they?', 'Ever since when?', "It's gross.", 'kind of crazy',
    "I'm going to train you", 'And I was like…', 'Here you go',
  ]);
  for (const w of s.words) {
    assert.ok(w.translation && w.phonetic && w.example && w.exampleTranslation, `${w.word} incompleta`);
    assert.ok(w.example.toLowerCase().includes(w.word.replace(/[.…?]$/, '').toLowerCase()),
      `el ejemplo de "${w.word}" no la usa`);
  }
});

test('"I wish you had to" no entra hasta saber qué decía', () => {
  const s = sesion(sembrar({ podcastLog: [] }));
  assert.ok(!s.words.some(w => /wish/i.test(w.word)));
});

test('una sola vez: si él la borra, no vuelve', () => {
  const m = sembrar({ podcastLog: [] });
  m.podcastLog = [];                       // la borró
  sembrar(m);
  assert.equal(m.podcastLog.length, 0);
});

test('no se duplica si ya llegó de otro aparato', () => {
  const m = sembrar({ podcastLog: [] });
  const otro = sembrar({ podcastLog: [JSON.parse(JSON.stringify(sesion(m)))] });
  assert.equal(otro.podcastLog.length, 1);
});

test('va fuera de las unidades', () => {
  assert.doesNotMatch(bloque, /merged\.units/);
});
