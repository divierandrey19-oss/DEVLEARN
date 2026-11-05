/**
 * El calendario del B1 (5 de noviembre).
 *
 * Él mandó la lista de BLOCKS del B1: 123 clases, la 1 (inducción) ya vista.
 * Terminó el A2, y sus clases 37-89 siguen marcadas en classesDone y con fecha
 * en classSchedule (y se unen entre aparatos). Si el B1 reusara esos números,
 * sus clases 37-89 saldrían como vistas. Por eso cada clase del B1 tiene
 * id = 1000 + su número, y él ve el número de BLOCKS (`n`).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const sintaxis = fuente.match(/const COURSE_SYLLABUS = \[[\s\S]*?\n\];/)[0];
const { COURSE_SYLLABUS, numClase, numDeId } = h.ejecutar(`${sintaxis}
  ${h.extraerFuncion('numClase')}
  ${h.extraerFuncion('numDeId')}
  return { COURSE_SYLLABUS, numClase, numDeId };`, {});

test('de la clase 2 a la 123, en el orden de BLOCKS, sin chocar con las del A2', () => {
  assert.deepEqual(COURSE_SYLLABUS.map(c => c.n), Array.from({ length: 122 }, (_, i) => i + 2));
  for (const c of COURSE_SYLLABUS) assert.equal(c.id, 1000 + c.n);
  assert.ok(COURSE_SYLLABUS.every(c => c.id > 89), 'los ids del A2 (37-89) siguen en sus datos');
  assert.equal(COURSE_SYLLABUS.at(-1).title, 'INTERNATIONAL FINAL EXAM / B1 / 1h 40m');
});

test('cada clase de páginas dice sus páginas y su unidad', () => {
  const paginas = COURSE_SYLLABUS.filter(c => c.pages);
  for (let u = 1; u <= 10; u++) assert.equal(paginas.filter(c => c.unit === `b1_${u}`).length, 5, `Unit ${u}: 5 clases de páginas`);
  for (const c of paginas) {
    const [rango, unidad] = c.title.split(' / Unit ');
    const nums = rango.split('-');
    assert.equal(c.pages, `${nums[0]}-${nums[nums.length - 1]}`, c.title);
    assert.equal(c.unit, `b1_${unidad}`, c.title);
  }
  assert.deepEqual(COURSE_SYLLABUS.find(c => c.n === 7), { id: 1007, n: 7, title: '1-2-3 / Unit 1', pages: '1-3', unit: 'b1_1' });
});

test('los exámenes, con las unidades que entran en cada uno', () => {
  const examenes = COURSE_SYLLABUS.filter(c => c.exam).map(c => [c.n, c.units || null]);
  assert.deepEqual(examenes, [
    [6, null],         // Speaking test check 0
    [14, [1, 1]], [25, [2, 2]], [37, [3, 3]],
    [47, null],        // Oral presentation 1: de todo
    [62, [1, 5]],      // Review test 1: Units 1-5, como en el A2
    [63, [4, 5]], [70, [6, 6]], [82, [7, 7]], [96, [8, 8]],
    [105, null],       // Oral presentation 2
    [119, [6, 10]], [121, [9, 10]],
    [123, null],       // el final
  ]);
  assert.ok(!COURSE_SYLLABUS.find(c => c.n === 122).exam, 'el autonomous work no es un examen');
});

test('él ve el número de BLOCKS, no el id', () => {
  assert.equal(numClase(COURSE_SYLLABUS.find(c => c.n === 14)), 14);
  assert.equal(numClase({ id: 87, title: 'SPEAKING TEST / Units 9-10' }), 87, 'las del A2, sin n, siguen igual');
  assert.equal(numDeId(1014), 14);
  const curso = h.extraerFuncion('renderCourseTracker');
  assert.equal(curso.split('${numClase(c)}</span> · ${escapeHtml(c.title)}').length - 1, 2, 'pendientes y vistas');
  assert.match(curso, /🕕 Today: class \$\{numClase\(todayClass\)\}/);
  assert.match(h.extraerFuncion('copyScheduleText'), /return `\$\{numClase\(c\)\} · \$\{dia\}/);
  assert.match(h.extraerFuncion('scheduleClass'), /\$\{numClase\(cls\)\}<\/span>/);
  for (const f of ['saveClassSchedule', 'clearClassSchedule', 'unmarkClass', 'markClassDone']) {
    const cuerpo = h.extraerFuncion(f);
    assert.doesNotMatch(cuerpo, /Class \$\{id\}/, `${f} muestra el id`);
  }
});

test('borrar fechas "de la 7 a la 13" usa los números que él ve', () => {
  const valores = { 'clear-from': '7', 'clear-to': '13' };
  const sched = Object.fromEntries(COURSE_SYLLABUS.filter(c => c.n >= 5 && c.n <= 20).map(c => [c.id, '2026-11-20']));
  const { clearRangeIds } = h.ejecutar(`${sintaxis}
    ${h.extraerFuncion('numClase')}
    ${h.extraerFuncion('clearRangeIds')}
    return { clearRangeIds };`, {
    document: { getElementById: id => ({ value: valores[id] }) },
    state: { classSchedule: sched, classesDone: [1010] },
  });
  assert.deepEqual(clearRangeIds(), [1007, 1008, 1009, 1011, 1012, 1013], 'sin la 10, que ya está vista');
  assert.match(h.extraerFuncion('openClearDates'), /max="\$\{tope\}"/, 'ya no se queda en 89');
});
