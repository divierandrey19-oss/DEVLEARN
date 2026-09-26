/**
 * La pantalla antes de empezar las flashcards, cuando hay una sesión guardada.
 *
 * Él tocó "Memory review 8" y el botón grande y verde le ofrecía "Seguir donde
 * iba": una sesión de toda la unidad empezada en la tarde, con 307 tarjetas por
 * delante y sin esas 8. La sesión guarda su lista al empezar, así que las
 * palabras que quedan en "aprendiendo" durante ella no están en lo que falta.
 * Además solo mostraba la hora, sin el día.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { countDueInSession, sessionStartedLabel } = h.ejecutar(`
  ${h.extraerFuncion('dateLocal')}
  ${h.extraerFuncion('todayLocal')}
  ${h.extraerFuncion('countDueInSession')}
  ${h.extraerFuncion('sessionStartedLabel')}
  return { countDueInSession, sessionStartedLabel };
`, {});

// ---------------------------------------------------------------------------
// ¿Cuántas pendientes trae lo que le falta a la sesión?
// ---------------------------------------------------------------------------

const vocab = Array.from({ length: 10 }, (_, i) => ({ word: `w${i}` }));
const pendientes = new Set(['w1', 'w2', 'w8']);
const esPendiente = v => pendientes.has(v.word);

test('solo cuenta lo que falta, no lo que ya pasó', () => {
  // Como su caso: las pendientes quedaron en la parte ya vista de la sesión.
  const sesion = { queue: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], position: 5 };
  assert.equal(countDueInSession(sesion, vocab, esPendiente), 1, 'solo w8 está por delante');
});

test('una sesión que es el repaso de pendientes las trae todas', () => {
  const sesion = { queue: [1, 2, 8], position: 0 };
  assert.equal(countDueInSession(sesion, vocab, esPendiente), 3);
});

test('sin sesión, o con índices que ya no existen, no lanza', () => {
  assert.equal(countDueInSession(null, vocab, esPendiente), 0);
  assert.equal(countDueInSession({ queue: [99, 1], position: 0 }, vocab, esPendiente), 1);
});

// ---------------------------------------------------------------------------
// Cuándo empezó la sesión, con el día.
// ---------------------------------------------------------------------------

test('una sesión de hoy dice "hoy a las …"', () => {
  assert.match(sessionStartedLabel(Date.now()), /^hoy a las /);
});

test('una sesión de ayer dice "ayer a las …"', () => {
  assert.match(sessionStartedLabel(Date.now() - 24 * 3600 * 1000), /^ayer a las /);
});

test('una sesión de hace días dice la fecha', () => {
  const etiqueta = sessionStartedLabel(Date.now() - 5 * 24 * 3600 * 1000);
  assert.match(etiqueta, /^el .+ a las /);
  assert.doesNotMatch(etiqueta, /^(hoy|ayer)/);
});

// ---------------------------------------------------------------------------
// El cableado de la pantalla.
// ---------------------------------------------------------------------------

const pantalla = h.extraerFuncion('openFcStudy');

test('si la sesión guardada deja pendientes fuera, se muestra primero el repaso', () => {
  assert.match(pantalla,
    /const pendientesFuera = !!activeStudy && srsCounts\.due > 0 && dueEnSesion < srsCounts\.due;/,
    'la condición decide qué botón es el principal');
  assert.match(pantalla, /activeStudy && pendientesFuera \? `/, 'y es la que se usa para elegir la pantalla');
});

test('el botón principal repasa las pendientes y el secundario sigue la sesión', () => {
  const bloque = pantalla.slice(pantalla.indexOf('activeStudy && pendientesFuera ? `'),
                                pantalla.indexOf('` : activeStudy ? `'));
  const repasar = bloque.indexOf('Repasar ');
  const seguir = bloque.indexOf('Seguir esa sesión');
  assert.ok(repasar > 0 && seguir > repasar, 'primero "Repasar", después "Seguir esa sesión"');
  assert.match(bloque.slice(0, repasar), /onclick="startFcSession\(false\)"/,
    '"Repasar" arma una sesión nueva con las pendientes');
  assert.match(bloque.slice(repasar, seguir + 60), /onclick="startFcSession\(true\)"/,
    '"Seguir esa sesión" retoma la guardada');
});

test('avisa que repasar cierra la sesión guardada, sin perder lo calificado', () => {
  assert.match(pantalla, /Si repasas las pendientes, se cierra; lo que ya calificaste queda guardado\./);
});

test('la sesión guardada muestra el día, no solo la hora', () => {
  assert.doesNotMatch(pantalla, /Empezaste a las \$\{new Date/, 'quedó la versión que solo decía la hora');
  assert.match(pantalla, /sessionStartedLabel\(activeStudy\.startedAt\)/);
});
