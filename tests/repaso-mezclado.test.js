/**
 * El repaso diario (Flashcards → "Start today's review") toma 20 tarjetas: las
 * que más falla, las más atrasadas, las que está aprendiendo, las de hoy y
 * hasta 5 nuevas. Las palabras que estudió el mismo día vencen el mismo día, así
 * que las 20 más atrasadas salían de una sola unidad. Él lo pidió revuelto
 * (4 de octubre): ahora van por turnos entre unidades, sin perder la prioridad.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { intercalarUnidades } = h.ejecutar(`${h.extraerFuncion('intercalarUnidades')} return { intercalarUnidades };`, {});

const u = n => ({ key: `a2_${n}`, lid: 'a2', uid: n });
const it = (n, w) => ({ unit: u(n), word: { word: w } });

test('por turnos entre unidades; cada unidad conserva su orden', () => {
  const lista = [it(3, 'a'), it(3, 'b'), it(3, 'c'), it(5, 'x'), it(5, 'y'), it(9, 'm')];
  assert.deepEqual(intercalarUnidades(lista).map(i => i.word.word), ['a', 'x', 'm', 'b', 'y', 'c']);
});

test('la unidad de la tarjeta más urgente va primero; no se pierde ninguna', () => {
  const lista = [it(7, 'urgente'), it(2, 'otra'), it(7, 'segunda')];
  const out = intercalarUnidades(lista);
  assert.equal(out[0].word.word, 'urgente');
  assert.equal(out.length, 3);
  assert.deepEqual(intercalarUnidades([]), []);
  assert.deepEqual(intercalarUnidades(undefined), []);
  // Una unidad sin "key" (copia vieja) se agrupa por nivel y número.
  const sinKey = [{ unit: { lid: 'a2', uid: 4 }, word: { word: 'p' } }, { unit: { lid: 'a2', uid: 4 }, word: { word: 'q' } }, it(1, 'r')];
  assert.deepEqual(intercalarUnidades(sinKey).map(i => i.word.word), ['p', 'r', 'q']);
});

test('el repaso diario intercala cada grupo, y las atrasadas siguen de la más vieja a la más nueva', () => {
  const fuente = h.fuente();
  const i = fuente.indexOf('buildDailySession(units, maxCards = 20) {');
  const cuerpo = fuente.slice(i, fuente.indexOf('return session;', i));
  assert.match(cuerpo, /push\(intercalarUnidades\(due\.leeches\)\);/);
  assert.match(cuerpo, /push\(intercalarUnidades\(due\.overdue\.sort\(\(a,b\) => a\.card\.dueDate\.localeCompare\(b\.card\.dueDate\)\)\)\);/);
  assert.match(cuerpo, /push\(intercalarUnidades\(due\.learning\)\);/);
  assert.match(cuerpo, /push\(intercalarUnidades\(due\.due\)\);/);
  assert.match(cuerpo, /push\(intercalarUnidades\(due\.new\)\.slice\(0, 5\)\);/);
});
