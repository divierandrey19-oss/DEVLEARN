/**
 * El plan de hoy, arriba en el Dashboard (5 de noviembre).
 *
 * "Quiero que en el día de hoy me recuerde qué me toca, ordenadamente: 100
 * flashcards, repasar gramática de la Unit 1 del A2, ejercicios, textos del
 * día; así hago realmente cosas que mayormente no hago." Escogió que la unidad
 * se quede hasta terminarla, y sumó 15 minutos de listening y My life.
 * Lo que se puede medir se marca solo; lo demás, con el círculo.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const sintaxis = fuente.match(/const COURSE_SYLLABUS = \[[\s\S]*?\n\];/)[0];
const HOY = '2026-11-05';
const base = {
  getUnitGrammar: u => u.grammar || [], getUnitExercises: u => u.exercises || [],
  SRS: { META_DIARIA: 100 },
};
const { unidadDelPlan, planDeHoy, hechasHoyEn, minutosDeListening } = h.ejecutar(`${sintaxis}
  ${['tieneTareas', 'unidadDelPlan', 'planDeHoy', 'hechasHoyEn', 'minutosDeListening'].map(f => h.extraerFuncion(f)).join('\n')}
  return { unidadDelPlan, planDeHoy, hechasHoyEn, minutosDeListening };`, base);

const unidad = (key, conTareas = true) => {
  const [lid, uid] = key.split('_');
  return { key, lid, uid: Number(uid), grammar: conTareas ? [{ title: 'g' }] : [], exercises: conTareas ? [{ q: 'e' }] : [] };
};
const a2 = () => Object.fromEntries(['a2_1', 'a2_2', 'a2_3'].map(k => [k, unidad(k)]));

test('la unidad se queda hasta terminarla, y después sigue la próxima', () => {
  assert.deepEqual(unidadDelPlan({ units: a2() }, HOY), { key: 'a2_1', b1: false }, 'arranca en la Unit 1');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: null } }, '2026-11-09').key, 'a2_1', 'sin terminarla, días después sigue');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: HOY } }, HOY).key, 'a2_1', 'el mismo día que la termina, todavía');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: HOY } }, '2026-11-06').key, 'a2_2', 'al otro día, la siguiente');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_3', terminada: HOY } }, '2026-11-06').key, 'a2_1', 'después de la última, vuelve a la 1');
  const sinGramatica = { ...a2(), a2_2: unidad('a2_2', false) };
  assert.equal(unidadDelPlan({ units: sinGramatica, planDiario: { unidad: 'a2_1', terminada: HOY } }, '2026-11-06').key, 'a2_3', 'una unidad sin gramática ni ejercicios se salta');
  assert.equal(unidadDelPlan({ units: {} }, HOY), null);
});

test('con el B1 en la app, la unidad es la de la última clase de páginas que marcó', () => {
  const units = { ...a2(), b1_1: unidad('b1_1') };
  assert.deepEqual(unidadDelPlan({ units, classesDone: [1002, 1007] }, HOY), { key: 'b1_1', b1: true });
  assert.equal(unidadDelPlan({ units: a2(), classesDone: [1007] }, HOY).key, 'a2_1', 'sin las páginas del B1 subidas, sigue el A2');
  assert.equal(unidadDelPlan({ units, classesDone: [1002] }, HOY).key, 'a2_1', 'sin clases de páginas del B1 vistas, sigue el A2');
});

const cuentas = (extra = {}) => ({ unidad: { key: 'a2_1', b1: false }, flashcards: 0, gramatica: 0, ejercicios: 0,
  textos: 1, textosEnRepaso: true, listening: 0, vida: 0, ...extra });

test('en el orden que él dijo, y lo que se mide se marca solo', () => {
  const p = planDeHoy({}, HOY, cuentas());
  assert.deepEqual(p.map(i => i.id), ['flash', 'grammar', 'exercises', 'texts', 'listening', 'life']);
  assert.deepEqual(p.map(i => i.titulo), ['100 flashcards', 'Grammar · Unit 1 (A2)', 'Exercises · Unit 1 (A2)', 'Texts of the day', 'Listening · 15 min', 'My life · one round']);
  assert.ok(p.every(i => !i.hecho));
  const hecho = id => planDeHoy({}, HOY, cuentas({ flashcards: 100, gramatica: 5, ejercicios: 5, textos: 0, listening: 15, vida: 5 })).find(i => i.id === id).hecho;
  for (const id of ['flash', 'grammar', 'exercises', 'texts', 'listening', 'life']) assert.ok(hecho(id), id);
  const casi = planDeHoy({}, HOY, cuentas({ flashcards: 99, gramatica: 4, ejercicios: 4, listening: 14, vida: 4 }));
  assert.ok(casi.every(i => !i.hecho), 'a uno de la meta, todavía no');
});

test('lo que no se mide lo marca él, y la marca es de hoy y de esa unidad', () => {
  const marcas = { planHoy: { fecha: HOY, hechos: { 'grammar:a2_1': true, listening: true } } };
  const p = planDeHoy(marcas, HOY, cuentas());
  assert.ok(p.find(i => i.id === 'grammar').hecho);
  assert.ok(p.find(i => i.id === 'listening').hecho);
  assert.ok(!p.find(i => i.id === 'exercises').hecho);
  assert.ok(!planDeHoy(marcas, HOY, cuentas({ unidad: { key: 'a2_2', b1: false } })).find(i => i.id === 'grammar').hecho, 'la de la Unit 1 no marca la 2');
  assert.ok(!planDeHoy(marcas, '2026-11-06', cuentas()).some(i => i.hecho), 'al otro día, todo de nuevo');
  assert.equal(p.find(i => i.id === 'flash').marca, undefined, 'las flashcards se marcan solas');
  assert.equal(p.find(i => i.id === 'texts').marca, undefined, 'los textos también');
});

test('los textos solo salen si tiene textos en repaso; sin unidad, sin gramática ni ejercicios', () => {
  assert.ok(!planDeHoy({}, HOY, cuentas({ textosEnRepaso: false })).some(i => i.id === 'texts'), 'su compañera no tiene sus textos');
  assert.deepEqual(planDeHoy({}, HOY, cuentas({ unidad: null })).map(i => i.id), ['flash', 'texts', 'listening', 'life']);
});

test('cuenta lo de hoy: respuestas de la unidad y minutos de podcast', () => {
  assert.equal(hechasHoyEn({ a: { date: HOY }, b: { date: HOY }, c: { date: '2026-11-04' } }, HOY), 2);
  assert.equal(hechasHoyEn(undefined, HOY), 0);
  assert.equal(minutosDeListening({ podcastLog: [{ date: HOY, minutes: 10 }, { date: HOY, minutes: 6 }, { date: '2026-11-04', minutes: 30 }, { date: HOY, minutes: null }] }, HOY), 16);
});

test('al terminar gramática y ejercicios, queda anotada para pasar de unidad mañana', () => {
  const el = { innerHTML: '' };
  let guardados = 0;
  const st = { units: a2(), texts: [], podcastLog: [], planHoy: { fecha: HOY, hechos: { 'grammar:a2_1': true, 'exercises:a2_1': true } } };
  const { renderPlanHoy } = h.ejecutar(`${sintaxis}
    ${['tieneTareas', 'unidadDelPlan', 'planDeHoy', 'hechasHoyEn', 'minutosDeListening', 'renderPlanHoy'].map(f => h.extraerFuncion(f)).join('\n')}
    return { renderPlanHoy };`, {
    ...base, state: st, document: { getElementById: id => (id === 'plan-hoy' ? el : null) },
    todayLocal: () => HOY, save: () => { guardados++; }, repasadasHoy: () => 0, textReviewsDue: () => [],
    textInReview: () => false, vidaHoy: () => 0, escapeHtml: x => String(x),
  });
  renderPlanHoy();
  assert.deepEqual(st.planDiario, { unidad: 'a2_1', terminada: HOY });
  assert.match(el.innerHTML, /Grammar · Unit 1 \(A2\)/);
  st.planHoy.hechos['exercises:a2_1'] = false;
  renderPlanHoy();
  assert.equal(st.planDiario.terminada, null, 'si desmarca, ya no está terminada');
  assert.ok(guardados >= 2);
});

test('arriba en el Dashboard, y cada renglón abre lo suyo', () => {
  const hoy = fuente.indexOf('<div class="section-title dash-section">Today</div>');
  assert.ok(fuente.indexOf('<div id="plan-hoy"></div>', hoy) < fuente.indexOf('<div id="text-review"></div>', hoy), 'lo primero de Today');
  assert.match(h.extraerFuncion('renderDashboard'), /^function renderDashboard\(\) \{\n\s*renderPlanHoy\(\);/);
  // Él pidió un botón "Open" a la vista en cada renglón.
  assert.match(h.extraerFuncion('renderPlanHoy'), /<button class="btn \$\{i\.hecho \? 'btn-ghost' : 'btn-primary'\} btn-sm"[^>]*onclick="abrirDelPlan\('\$\{i\.id\}'\)">Open →<\/button>/);
  const abrir = h.extraerFuncion('abrirDelPlan');
  assert.match(abrir, /if \(id === 'flash'\) return openDailyReview\(\);/);
  assert.match(abrir, /openUnit\(lid, Number\(uid\)\);\n\s*return showUnitTab\(id\);/);
  assert.match(abrir, /if \(id === 'listening'\) return navigate\('podcasts'\);/);
  assert.match(abrir, /if \(id === 'life'\) return navigate\('life'\);/);
  assert.match(h.extraerFuncion('marcarPlan'), /if \(!state\.planHoy \|\| state\.planHoy\.fecha !== hoy\) state\.planHoy = \{ fecha: hoy, hechos: \{\} \};/);
});
