/**
 * Las fechas de las clases, entre el celular y el computador (9 de octubre).
 *
 * Al juntar con la nube ganaba siempre la nube, clase por clase. Él cambió en el
 * celular el speaking test al viernes 16 y el final al lunes 19; el computador,
 * con las fechas viejas (13 y 16), las volvió a subir, y el repaso enfocado en
 * las Units 9-10 se iba a apagar el 13, tres días antes del examen. Ahora cada
 * cambio guarda su hora (classScheduleAt) y gana el más nuevo.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { unirFechasDeClase } = h.ejecutar(`${h.extraerFuncion('unirFechasDeClase')} return { unirFechasDeClase };`, {});

const celular = { 87: '2026-10-16', '87_t': '06:00', 89: '2026-10-19', '89_t': '06:00', 85: '2026-10-09' };
const computador = { 87: '2026-10-13', '87_t': '06:00', 89: '2026-10-16', '89_t': '06:00', 85: '2026-10-09' };

test('lo que pasó: el cambio nuevo del celular gana a la copia vieja de la nube', () => {
  const f = unirFechasDeClase(celular, { 87: 2000, 89: 2000 }, computador, {});
  assert.equal(f.sched[87], '2026-10-16');
  assert.equal(f.sched[89], '2026-10-19');
  assert.deepEqual(f.at, { 87: 2000, 89: 2000 });
});

test('y al revés: el computador viejo recibe el cambio de la nube', () => {
  const f = unirFechasDeClase(computador, {}, celular, { 87: 2000, 89: 2000 });
  assert.equal(f.sched[87], '2026-10-16');
  assert.equal(f.sched[89], '2026-10-19');
});

test('fechas sin hora (las de antes): como siempre, gana la nube; lo que solo está aquí se queda', () => {
  const f = unirFechasDeClase({ 80: '2026-10-01', 81: '2026-10-08' }, {}, { 81: '2026-10-09' }, {});
  assert.deepEqual(f.sched, { 80: '2026-10-01', 81: '2026-10-09' });
  assert.deepEqual(f.at, {});
});

test('la hora de la clase va con su fecha', () => {
  const f = unirFechasDeClase({ 87: '2026-10-16', '87_t': '07:30' }, { 87: 5 }, { 87: '2026-10-13', '87_t': '06:00' }, { 87: 1 });
  assert.equal(f.sched['87_t'], '07:30');
});

test('borrar una fecha también es un cambio: si es el más nuevo, se borra; si no, vuelve', () => {
  assert.deepEqual(unirFechasDeClase({}, { 87: 9 }, { 87: '2026-10-13', '87_t': '06:00' }, { 87: 3 }).sched, {});
  assert.deepEqual(unirFechasDeClase({}, { 87: 3 }, { 87: '2026-10-16' }, { 87: 9 }).sched, { 87: '2026-10-16' });
});

test('cada forma de cambiar fechas guarda la hora del cambio, y la unión con la nube la usa', () => {
  for (const n of ['saveClassSchedule', 'clearClassSchedule', 'applyClearDates', 'applyBulkSchedule', 'applyBulkTime']) {
    assert.match(h.extraerFuncion(n), /marcarFechasDeClase\(/, n);
  }
  const fuente = h.fuente();
  assert.match(fuente, /const localScheduleAt = \{ \.\.\.\(state\.classScheduleAt \|\| \{\}\) \};/);
  assert.match(fuente, /const f = unirFechasDeClase\(localSchedule, localScheduleAt, imported\.classSchedule, imported\.classScheduleAt\);/);
  assert.doesNotMatch(fuente, /state\.classSchedule = \{ \.\.\.localSchedule, \.\.\.\(imported\.classSchedule/);
});

// ── Sus dos fechas, corregidas una vez ─────────────────────────────────────

function corregir(merged) {
  const fuente = h.fuente();
  const ini = fuente.indexOf('  if (!merged._fechasExamenesV1');
  assert.notEqual(ini, -1);
  const fin = fuente.indexOf('\n  }', ini) + 4;
  new Function('merged', fuente.slice(ini, fin))(merged);
  return merged;
}

test('donde están las fechas viejas exactas: speaking el 16 y final el 19, con la hora del cambio', () => {
  const m = corregir({ classSchedule: { ...computador } });
  assert.equal(m.classSchedule[87], '2026-10-16');
  assert.equal(m.classSchedule[89], '2026-10-19');
  assert.equal(m.classSchedule['87_t'], '06:00', 'la hora de la clase no se toca');
  assert.ok(m.classScheduleAt[87] > 0 && m.classScheduleAt[89] > 0);
  assert.equal(m._fechasExamenesV1, true);
});

test('en cualquier otro aparato (el de su compañera, uno ya corregido) no hace nada', () => {
  assert.deepEqual(corregir({ classSchedule: {} }).classSchedule, {});
  assert.deepEqual(corregir({ classSchedule: { ...celular } }).classSchedule, celular);
  assert.equal(corregir({ classSchedule: {} })._fechasExamenesV1, undefined);
});
