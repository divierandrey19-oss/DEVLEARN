/**
 * La tarjeta de cada unidad en Flashcards.
 *
 * La Unit 1 decía "291 words to start" con varias palabras ya estudiadas (los
 * puntos azules, estado "review"): la cuenta no las miraba. Y la leyenda solo
 * tenía naranja, verde y morado, así que el azul y el gris no se explicaban.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

function tarjeta(estados) {
  const vocab = estados.map((_, i) => ({ word: 'w' + i }));
  const progress = Object.fromEntries(estados.map((st, i) => ['w' + i, st]));
  const SRS = {
    readCard: (p, w) => ({ state: p[w] || 'new', lapses: 0, dueDate: null }),
    isDue: () => false,
    stateLabel: st => ({ label: st }),
    nextReviewLabel: () => '',
  };
  return h.ejecutar(`
    ${h.extraerFuncion('renderFcUnitCard')}
    return renderFcUnitCard(u, lvl);
  `, {
    SRS, todayLocal: () => '2026-10-01', getUnitVocab: u => u.vocab,
    u: { lid: 'a2', uid: 1, title: 'Unit 1', vocab, fcProgress: progress },
    lvl: { id: 'a2', color: '#5ac8fa' },
  });
}

test('las palabras vistas (azules) cuentan: ya no dice "to start" si hay estudiadas', () => {
  const html = tarjeta([...Array(10).fill('new'), 'review', 'review']);
  assert.doesNotMatch(html, /12 words to start/);
  assert.match(html, /2 seen · 10 new/);
});

test('si todas son nuevas, sí dice "to start"', () => {
  assert.match(tarjeta(['new', 'new', 'new']), /3 words to start/);
});

test('cuenta todas y omite las que van en cero', () => {
  const html = tarjeta(['mature', 'mastered', 'review', 'learning', 'new']);
  assert.match(html, /2 mature · 1 seen · 1 learning · 1 new/);
  assert.match(tarjeta(['mature', 'review']), /1 mature · 1 seen</);
});

test('la leyenda explica todos los colores de los puntos', () => {
  const html = tarjeta(['new']);
  for (const l of ['New', 'Learning', 'Seen', 'Mature', 'Mastered']) {
    assert.match(html, new RegExp(`></span>${l}\\s*</span>`), `falta ${l} en la leyenda`);
  }
});
