/**
 * La semilla de la fecha de examen.
 *
 * Se siembra una sola vez, y solo cuando el campo nunca existió: `undefined`
 * significa "nunca hubo fecha", `null` significa "el usuario la borró a
 * propósito" y eso no se vuelve a sembrar jamás.
 *
 * La semilla vieja apuntaba al 31 de julio. Pasada esa fecha, el contador se
 * oculta a propósito (`days < 0`), así que un dispositivo nuevo no mostraba
 * ningún examen.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

/**
 * El bloque de la semilla, recortado de migrateState(). Se ejecuta sobre un
 * objeto `merged` para probar solo esta regla, sin arrastrar las 380 líneas
 * de la migración completa.
 */
function sembrar(merged) {
  const fuente = h.fuente();
  const inicio = fuente.indexOf('  if (merged.examDate === undefined) {');
  assert.notEqual(inicio, -1, 'no se encontró el bloque de la semilla del examen');
  const fin = fuente.indexOf('\n  }', inicio) + 4;
  const bloque = fuente.slice(inicio, fin);
  new Function('merged', bloque)(merged);
  return merged;
}

test('un dispositivo nuevo recibe una fecha de examen que aún no ha pasado', () => {
  // Es el fallo que se arregla: con una fecha pasada el contador se ocultaba y
  // no se veía ningún examen.
  const m = sembrar({});

  assert.ok(m.examDate, 'siembra una fecha');
  assert.match(m.examDate, /^\d{4}-\d{2}-\d{2}$/, 'con el formato que espera el contador');
  assert.ok(m.examDate > '2026-09-26',
    `la semilla (${m.examDate}) tiene que ser futura, o el contador se oculta y no se ve nada`);
  assert.ok(m.examLabel, 'y una etiqueta que mostrar');
});

test('la fecha sembrada es el examen final de nivel', () => {
  // La que está registrada en el CLAUDE.md.
  const m = sembrar({});

  assert.equal(m.examDate, '2026-10-16');
  assert.match(m.examLabel, /[Ee]xamen final/);
});

test('una fecha que el usuario ya tiene NO se toca', () => {
  // Lo importante para quien ya usa la app: su fecha manda.
  const m = sembrar({ examDate: '2026-11-20', examLabel: 'Mi examen' });

  assert.equal(m.examDate, '2026-11-20', 'conserva su fecha');
  assert.equal(m.examLabel, 'Mi examen', 'y su etiqueta');
});

test('una fecha borrada a propósito sigue borrada', () => {
  // `null` es una decisión del usuario, no un hueco que rellenar.
  const m = sembrar({ examDate: null });

  assert.equal(m.examDate, null, 'no se re-siembra');
  assert.equal(m.examLabel, undefined);
});

test('una fecha pasada que el usuario guardó tampoco se reemplaza', () => {
  // Aunque ya no sirva: es suya. El contador la oculta, que es lo correcto.
  const m = sembrar({ examDate: '2026-07-31', examLabel: 'Speaking Test · Units 5-6' });

  assert.equal(m.examDate, '2026-07-31');
});
