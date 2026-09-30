/**
 * El Dashboard, ordenado con él.
 *
 * Medía como siete pantallas de celular y "tenía de todo un poco". Él eligió el
 * orden: arriba lo que toca hoy, luego el curso, luego el progreso y al final
 * los accesos. Se quitaron los niveles (ya están en Levels), la tarjeta que
 * repetía "continuar Unit 10" y el quiz y Focus de los accesos. La lista del
 * curso muestra las próximas 3 clases y un botón para ver todas.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const ini = fuente.indexOf('<div class="page active" id="page-dashboard">');
const fin = fuente.indexOf('<!-- ===== LEVELS PAGE ===== -->', ini);
const dashboard = fuente.slice(ini, fin);
const pos = marca => {
  const i = dashboard.indexOf(marca);
  assert.ok(i >= 0, `falta ${marca} en el Dashboard`);
  return i;
};

test('el orden que él eligió: hoy, el curso, el progreso, los accesos', () => {
  const orden = [
    '>Today<', 'id="text-review"', 'id="rec-challenge"', 'id="continue-card"',
    '>My course<', 'id="exam-countdown"', 'id="course-tracker"',
    '>Progress<', 'id="study-timer"', 'class="streak-board"', 'class="stats-row"',
    '>Shortcuts<', 'class="quick-row dash-shortcuts"',
  ].map(pos);
  assert.deepEqual(orden, orden.slice().sort((a, b) => a - b));
});

test('lo que se quitó no vuelve: niveles, la tarjeta repetida, quiz y Focus', () => {
  assert.doesNotMatch(dashboard, /id="dash-levels"/, 'los niveles están en Levels');
  assert.doesNotMatch(dashboard, /id="dash-hero"/, 'repetía la tarjeta de continuar');
  assert.doesNotMatch(dashboard, /quickQuiz\(\)/);
  assert.doesNotMatch(dashboard, /openFocusMode\(\)/, 'Focus ya está en la barra de arriba');
});

test('renderDashboard no busca nada que ya no está (se rompería al abrir)', () => {
  const codigo = h.extraerFuncion('renderDashboard');
  const ids = [...codigo.matchAll(/getElementById\('([\w-]+)'\)/g)].map(m => m[1]);
  assert.ok(ids.length > 5);
  for (const id of new Set(ids)) {
    assert.ok(fuente.includes(`id="${id}"`), `renderDashboard usa #${id}, que no existe`);
  }
  assert.doesNotMatch(codigo, /renderLevelsGrid\('dash-levels'\)/);
});

test('la lista del curso arranca con las próximas 3 y un botón para ver todas', () => {
  const curso = h.extraerFuncion('renderCourseTracker');
  assert.match(curso, /const expanded = window\.__courseOpen === true;/,
    'abierta solo mientras la mira: no se guarda abierta');
  assert.match(curso, /expanded \? remaining : remaining\.slice\(0, 3\)/);
  assert.match(curso, /See all \$\{remaining\.length\} classes/);
  assert.doesNotMatch(curso, /state\.courseTrackerOpen/);
});
