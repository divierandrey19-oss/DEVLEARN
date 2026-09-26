/**
 * Los números de repaso que se ven en pantalla.
 *
 * Él vio dos cosas raras en su celular, y las dos eran de cómo se mostraban los
 * números, no de sus datos:
 *
 * - En la pestaña Today de la unidad, el título decía "8 cards waiting for
 *   review" y el globito de Memory review decía 10: sumaba las 8 pendientes y
 *   las 2 difíciles. La sesión le mostraba 8.
 * - En Memory Review, la barra de colores dibujaba las pendientes como un tramo
 *   aparte aunque ya estaban dentro de los otros colores: con 2186 palabras la
 *   barra sumaba ~3100.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const HOY = '2026-09-26';
const AYER = '2026-09-25';
const MANANA = '2026-09-27';

const { fcBarBucket } = h.ejecutar(`
  ${h.extraerFuncion('fcBarBucket')}
  return { fcBarBucket };
`, {});

// ---------------------------------------------------------------------------
// La barra: cada tarjeta en un solo tramo.
// ---------------------------------------------------------------------------

test('una tarjeta nueva va al tramo de nuevas', () => {
  assert.equal(fcBarBucket({ state: 'new', dueDate: null }, HOY), 'new');
});

test('learning se queda en su tramo ámbar aunque esté pendiente', () => {
  // La leyenda dice "Learning = not yet consolidated": su tramo es suyo.
  assert.equal(fcBarBucket({ state: 'learning', dueDate: AYER }, HOY), 'learning');
  assert.equal(fcBarBucket({ state: 'learning', dueDate: HOY }, HOY), 'learning');
});

test('una tarjeta que toca hoy o está atrasada va al tramo azul, sea del estado que sea', () => {
  for (const state of ['review', 'mature', 'mastered']) {
    assert.equal(fcBarBucket({ state, dueDate: HOY }, HOY), 'due', `${state} que toca hoy`);
    assert.equal(fcBarBucket({ state, dueDate: AYER }, HOY), 'due', `${state} atrasada`);
  }
});

test('una tarjeta que no toca todavía va al tramo de su estado', () => {
  assert.equal(fcBarBucket({ state: 'review', dueDate: MANANA }, HOY), 'scheduled');
  assert.equal(fcBarBucket({ state: 'mature', dueDate: MANANA }, HOY), 'mature');
  assert.equal(fcBarBucket({ state: 'mastered', dueDate: MANANA }, HOY), 'mastered');
  assert.equal(fcBarBucket({ state: 'review', dueDate: null }, HOY), 'scheduled', 'sin fecha no está pendiente');
});

test('la barra suma exactamente las palabras que hay, y el azul + ámbar son las pendientes', () => {
  // Un mazo con de todo: estados mezclados, fechas pasadas, de hoy y futuras.
  const mazo = [];
  const estados = ['new', 'learning', 'review', 'mature', 'mastered'];
  const fechas = [null, AYER, HOY, MANANA];
  for (let i = 0; i < 400; i++) mazo.push({ state: estados[i % 5], dueDate: fechas[(i * 7) % 4] });

  const tramos = {};
  mazo.forEach(c => { const t = fcBarBucket(c, HOY); tramos[t] = (tramos[t] || 0) + 1; });
  const suma = Object.values(tramos).reduce((a, b) => a + b, 0);
  assert.equal(suma, mazo.length, 'cada tarjeta en un solo tramo: la barra no cuenta doble');

  // "Pendiente" con la misma definición que SRS.isDue.
  const pendientes = mazo.filter(c => c.state !== 'new' &&
    (c.state === 'learning' || (c.dueDate && c.dueDate <= HOY))).length;
  assert.equal((tramos.learning || 0) + (tramos.due || 0), pendientes,
    'ámbar + azul deben ser exactamente las pendientes, las mismas del número grande');

  const conocidos = ['new', 'learning', 'due', 'scheduled', 'mature', 'mastered'];
  assert.deepEqual(Object.keys(tramos).filter(t => !conocidos.includes(t)), [],
    'ninguna tarjeta cae en un tramo que la barra no dibuja');
});

test('la barra se dibuja con los tramos, no con los conteos que se superponen', () => {
  const codigo = h.extraerFuncion('renderAllFlashcards');
  const inicio = codigo.indexOf('<!-- State legend bar -->');
  assert.notEqual(inicio, -1, 'no se encontró la barra en renderAllFlashcards');
  const barra = codigo.slice(inicio, codigo.indexOf('</div>\n        <div', inicio));

  for (const tramo of ['new', 'learning', 'due', 'scheduled', 'mature', 'mastered']) {
    assert.match(barra, new RegExp(`flex:\\$\\{bar\\.${tramo}\\}`), `falta el tramo "${tramo}"`);
  }
  assert.doesNotMatch(barra, /flex:\$\{(totalDue|counts\.)/,
    'un tramo dibujado con totalDue o counts vuelve a contar las pendientes dos veces');
});

// ---------------------------------------------------------------------------
// El globito de Memory review en la pestaña Today.
// ---------------------------------------------------------------------------

test('el globito de Memory review cuenta las mismas tarjetas que el título', () => {
  const codigo = h.extraerFuncion('renderTodayTab');
  const paso = codigo.slice(codigo.indexOf("title: 'Memory review'"));
  assert.notEqual(paso.length, codigo.length, 'no se encontró el paso Memory review');
  const badge = /badge:\s*([^,\n]+),/.exec(paso);
  assert.ok(badge, 'no se encontró el globito del paso');
  assert.equal(badge[1].trim(), 'dueCount || null',
    'el globito debe ser las pendientes (dueCount), como el título "N cards waiting for review"');
});

test('las difíciles no se suman al globito de Memory review', () => {
  // Ya se dicen en el subtítulo ("⚠ 2 difficult") y tienen su propio globito
  // en Practice with tutor. Sumarlas aquí prometía tarjetas que la sesión no
  // muestra, y contaba dos veces una difícil que además tocaba hoy.
  assert.doesNotMatch(h.extraerFuncion('renderTodayTab'), /dueCount\s*\+\s*leechCount/);
});
