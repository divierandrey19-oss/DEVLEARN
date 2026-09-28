/**
 * Qué trae la sesión de flashcards al tocar Start.
 *
 * La pantalla decía "38 new words to learn" y la sesión traía la unidad entera
 * (354): las nuevas más todas las ya vistas que no tocaban hoy. Él tuvo que
 * hacerlas todas. La sesión tiene que traer lo que la pantalla prometió.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const HOY = '2026-09-28';

function montar(progreso, n) {
  const vocab = Array.from({ length: n }, (_, i) => ({ word: `w${i}`, difficulty: 'medium' }));
  const fc = { vocab };
  const u = { fcProgress: progreso };
  const { buildFcQueue } = h.ejecutar(`
    ${h.extraerFuncion('buildFcQueue')}
    return { buildFcQueue };
  `, {
    fc,
    getUnit: () => u,
    todayLocal: () => HOY,
    SRS: {
      initCard: (p, v) => (p[v.word] = p[v.word] || { state: 'new', easeFactor: 2.5 }),
      suggestMode: () => 'classic',
    },
  });
  return (dueOnly, newOnly) => buildFcQueue('a2', '9', dueOnly, newOnly).slice().sort((a, b) => a - b);
}

const vista = (dueDate, extra = {}) => ({ state: 'review', lastReview: '2026-09-20', dueDate, easeFactor: 2.5, ...extra });

test('sin pendientes, Start trae solo las palabras nuevas', () => {
  // w0-w2 nuevas; w3-w7 ya vistas, para otro día.
  const prog = { w3: vista('2026-10-05'), w4: vista('2026-10-05'), w5: vista('2026-10-09'),
                 w6: vista('2026-10-01', { easeFactor: 1.5 }), w7: vista('2026-11-01', { state: 'mature' }) };
  const cola = montar(prog, 8)(false, false);
  assert.deepEqual(cola, [0, 1, 2], 'la pantalla dijo 3 nuevas: son esas 3, no las 8');
});

test('con pendientes, Start trae solo las pendientes', () => {
  const prog = { w1: vista(HOY), w2: vista('2026-09-27'), w3: vista('2026-10-05') };
  assert.deepEqual(montar(prog, 4)(true, false), [1, 2]);
});

test('"Learn new words" sigue trayendo 5 como máximo', () => {
  assert.equal(montar({}, 12)(false, true).length, 5);
});

test('sin nada nuevo ni pendiente, es un repaso de toda la unidad', () => {
  const prog = { w0: vista('2026-10-05'), w1: vista('2026-10-06'), w2: vista('2026-10-07') };
  assert.deepEqual(montar(prog, 3)(false, false), [0, 1, 2]);
});
