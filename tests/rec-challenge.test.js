/**
 * El reto de 20 días: grabarse hablando en inglés 20 días seguidos.
 *
 * Salió de sus notas de un podcast. Un día cuenta cuando graba un texto
 * completo de 30 segundos o más, o cuando lo marca a mano porque grabó fuera
 * de la app. Lo que importa es que la cuenta sea honesta: que un día perdido
 * la corte, que hoy sin grabar todavía no la corte, y que un día no cuente dos
 * veces.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

function montar({ hoy = '2026-09-27', recDays } = {}) {
  const state = recDays === undefined ? {} : { recDays };
  let guardados = 0;
  const f = h.ejecutar(`
    ${h.extraerFuncion('dateLocal')}
    ${h.extraerFuncion('recChallengeRun')}
    ${h.extraerFuncion('markRecDay')}
    return { recChallengeRun, markRecDay };
  `, { state, todayLocal: () => hoy, save: () => { guardados++; } });
  return { ...f, state, guardados: () => guardados };
}

// ---------------------------------------------------------------------------
// La cuenta de días seguidos.
// ---------------------------------------------------------------------------

test('cuenta los días seguidos que terminan hoy', () => {
  const { recChallengeRun } = montar();
  assert.equal(recChallengeRun(['2026-09-25', '2026-09-26', '2026-09-27'], '2026-09-27'), 3);
});

test('si hoy todavía no grabó, la racha de ayer sigue viva', () => {
  const { recChallengeRun } = montar();
  assert.equal(recChallengeRun(['2026-09-25', '2026-09-26'], '2026-09-27'), 2,
    'a la mañana no puede verse en cero por no haber grabado todavía');
});

test('un día perdido corta la racha', () => {
  const { recChallengeRun } = montar();
  assert.equal(recChallengeRun(['2026-09-23', '2026-09-24', '2026-09-25'], '2026-09-27'), 0,
    'el 26 no grabó: ya no son días seguidos');
  assert.equal(recChallengeRun(['2026-09-20', '2026-09-21', '2026-09-26', '2026-09-27'], '2026-09-27'), 2,
    'cuenta solo lo que viene después del hueco');
});

test('cruza el cambio de mes', () => {
  const { recChallengeRun } = montar();
  assert.equal(recChallengeRun(['2026-09-29', '2026-09-30', '2026-10-01'], '2026-10-01'), 3);
});

test('los 20 días hasta el examen se cuentan enteros', () => {
  const { recChallengeRun } = montar();
  const dias = Array.from({ length: 20 }, (_, i) => `2026-09-${String(27 + i).padStart(2, '0')}`)
    .map(d => {
      // 2026-09-31 no existe: del 27 de septiembre al 16 de octubre.
      const n = Number(d.slice(8));
      return n <= 30 ? d : `2026-10-${String(n - 30).padStart(2, '0')}`;
    });
  assert.equal(dias[dias.length - 1], '2026-10-16');
  assert.equal(recChallengeRun(dias, '2026-10-16'), 20);
});

test('sin días, o con la lista vacía, es cero y no lanza', () => {
  const { recChallengeRun } = montar();
  assert.equal(recChallengeRun(undefined, '2026-09-27'), 0);
  assert.equal(recChallengeRun([], '2026-09-27'), 0);
});

// ---------------------------------------------------------------------------
// Marcar el día.
// ---------------------------------------------------------------------------

test('marcar el día lo guarda una sola vez', () => {
  const m = montar({ recDays: ['2026-09-26'] });
  assert.equal(m.markRecDay(), true, 'la primera vez es nueva');
  assert.equal(m.markRecDay(), false, 'la segunda no: no cuenta dos veces');
  assert.deepEqual(m.state.recDays, ['2026-09-26', '2026-09-27']);
  assert.equal(m.guardados(), 1, 'solo se guarda cuando cambia algo');
});

test('funciona aunque el estado no traiga la lista todavía', () => {
  const m = montar();
  assert.equal(m.markRecDay(), true);
  assert.deepEqual(m.state.recDays, ['2026-09-27']);
});

// ---------------------------------------------------------------------------
// El cableado.
// ---------------------------------------------------------------------------

test('grabar el texto completo 30 segundos o más cuenta el día', () => {
  // Es async, y el arnés solo recorta `function`: se corta a mano.
  const fuente = h.fuente();
  const grabar = fuente.slice(fuente.indexOf('async function toggleLongRecord('),
                              fuente.indexOf('function playBorrador('));
  assert.ok(grabar.length > 100, 'no se encontró toggleLongRecord');
  assert.match(grabar, /secs >= 30 && markRecDay\(\)/);
});

test('el panel está en el inicio', () => {
  const inicio = h.extraerFuncion('renderDashboard');
  assert.match(inicio, /renderRecChallenge\(\);/);
  assert.match(h.fuente(), /<div id="rec-challenge"><\/div>/);
});

test('los días de otro dispositivo se suman, no se pisan', () => {
  // Como classesDone: una lista de fechas se puede unir; un contador no.
  const fuente = h.fuente();
  assert.match(fuente, /const localRecDays {3}= \[\.\.\.\(state\.recDays \|\| \[\]\)\];/);
  assert.match(fuente, /state\.recDays = \[\.\.\.new Set\(\[\.\.\.localRecDays, \.\.\.\(imported\.recDays \|\| \[\]\)\]\)\]\.sort\(\);/);
});
