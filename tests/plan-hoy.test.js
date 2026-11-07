/**
 * El plan de hoy, arriba en el Dashboard (5 de noviembre).
 *
 * "Quiero que en el día de hoy me recuerde qué me toca, ordenadamente: 100
 * flashcards, repasar gramática de la Unit 1 del A2, ejercicios, textos del
 * día; así hago realmente cosas que mayormente no hago." Escogió que la unidad
 * se quede hasta terminarla, y sumó 15 minutos de listening y My life.
 * Después: "¿por qué 5? Deberían ser todos los de una unidad completa". Una
 * unidad son 140-200, así que escogió 40 ejercicios y 20 de gramática al día,
 * y la unidad cambia cuando están todos.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const sintaxis = fuente.match(/const COURSE_SYLLABUS = \[[\s\S]*?\n\];/)[0];
const HOY = '2026-11-05';
const base = {
  getUnitGrammar: u => ((u && u.batches) || []).flatMap(b => b.grammar || []),
  getUnitExercises: u => ((u && u.batches) || []).flatMap(b => b.exercises || []),
  SRS: { META_DIARIA: 100 },
};
const FUNCIONES = ['tieneTareas', 'unidadDelPlan', 'planDeHoy', 'hechasHoyEn', 'avanceDeUnidad', 'unidadCompleta', 'minutosDeListening'];
const { unidadDelPlan, planDeHoy, hechasHoyEn, avanceDeUnidad, unidadCompleta, minutosDeListening } = h.ejecutar(`${sintaxis}
  ${FUNCIONES.map(f => h.extraerFuncion(f)).join('\n')}
  return { ${FUNCIONES.join(', ')} };`, base);

const regla = n => ({ title: 'g', drillSentences: Array.from({ length: n }, (_, i) => ({ q: `d${i}` })) });
const ejercicio = (i, type = 'fill_blank') => ({ type, answer: `Answer ${i}` });
const unidad = (key, conTareas = true) => {
  const [lid, uid] = key.split('_');
  return { key, lid, uid: Number(uid), batches: conTareas ? [{ grammar: [regla(2)], exercises: [ejercicio(1)] }] : [{}] };
};
const a2 = () => Object.fromEntries(['a2_1', 'a2_2', 'a2_3'].map(k => [k, unidad(k)]));

test('la unidad se queda hasta terminarla, y después sigue la próxima', () => {
  assert.deepEqual(unidadDelPlan({ units: a2() }, HOY), { key: 'a2_1', b1: false }, 'arranca en la Unit 1');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: null } }, '2026-11-09').key, 'a2_1', 'sin terminarla, días después sigue');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: HOY } }, HOY).key, 'a2_1', 'el mismo día que la termina, todavía');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_1', terminada: HOY } }, '2026-11-06').key, 'a2_2', 'al otro día, la siguiente');
  assert.equal(unidadDelPlan({ units: a2(), planDiario: { unidad: 'a2_3', terminada: HOY } }, '2026-11-06').key, 'a2_1', 'después de la última, vuelve a la 1');
  const sinTareas = { ...a2(), a2_2: unidad('a2_2', false) };
  assert.equal(unidadDelPlan({ units: sinTareas, planDiario: { unidad: 'a2_1', terminada: HOY } }, '2026-11-06').key, 'a2_3', 'una unidad sin gramática ni ejercicios se salta');
  assert.equal(unidadDelPlan({ units: {} }, HOY), null);
});

test('con el B1 en la app, la unidad es la de la última clase de páginas que marcó', () => {
  const units = { ...a2(), b1_1: unidad('b1_1') };
  assert.deepEqual(unidadDelPlan({ units, classesDone: [1002, 1007] }, HOY), { key: 'b1_1', b1: true });
  assert.equal(unidadDelPlan({ units: a2(), classesDone: [1007] }, HOY).key, 'a2_1', 'sin las páginas del B1 subidas, sigue el A2');
  assert.equal(unidadDelPlan({ units, classesDone: [1002] }, HOY).key, 'a2_1', 'sin clases de páginas del B1 vistas, sigue el A2');
});

test('cuenta toda la unidad con las claves con que la app guarda cada respuesta', () => {
  // Una sola página: las reglas van por posición ("0-1"); varias: por lote ("b1_0-1").
  const una = { batches: [{ grammar: [regla(2), regla(1)], exercises: [ejercicio(1), ejercicio(2), ejercicio(2), ejercicio(3, 'matching')] }] };
  una.drillState = { '0-0': { date: HOY }, '1-0': { date: '2026-11-01' } };
  una.exerciseState = { 'fill_blank_answer 1': { date: HOY }, matching_7: { date: '2026-11-04' } };
  const a = avanceDeUnidad(una, '2026-11-03', HOY);
  assert.deepEqual(a.gramatica, { total: 3, hechas: 1, hoy: 1 }, 'lo de antes de empezar con la unidad no cuenta');
  assert.deepEqual(a.ejercicios, { total: 3, hechas: 2, hoy: 1 }, 'dos con la misma respuesta son uno; los de unir, por posición');
  const varias = { batches: [{ grammar: [regla(1)] }, { grammar: [regla(2)] }], drillState: { 'b0_0-0': { date: HOY }, 'b1_0-1': { date: HOY } } };
  assert.deepEqual(avanceDeUnidad(varias, HOY, HOY).gramatica, { total: 3, hechas: 2, hoy: 2 });
  assert.ok(!unidadCompleta(a));
  assert.ok(unidadCompleta({ gramatica: { total: 0, hechas: 0 }, ejercicios: { total: 3, hechas: 3 } }), 'sin práctica de gramática, basta con los ejercicios');
});

const avance = (total, hechas, hoy) => ({ total, hechas, hoy });
const cuentas = (extra = {}) => ({ unidad: { key: 'a2_1', b1: false }, flashcards: 0,
  gramatica: avance(60, 0, 0), ejercicios: avance(130, 0, 0),
  textos: 1, textosEnRepaso: true, listening: 0, vida: 0, ...extra });

test('en el orden que él dijo, y se marca solo con la dosis del día', () => {
  const p = planDeHoy({}, HOY, cuentas());
  assert.deepEqual(p.map(i => i.id), ['flash', 'grammar', 'exercises', 'texts', 'listening', 'life']);
  assert.deepEqual(p.map(i => i.titulo), ['100 flashcards', 'Grammar · Unit 1 (A2)', 'Exercises · Unit 1 (A2)', 'Texts of the day', 'Listening · 15 min', 'My life · one round']);
  assert.ok(p.every(i => !i.hecho));
  const listo = planDeHoy({}, HOY, cuentas({ flashcards: 100, gramatica: avance(60, 20, 20), ejercicios: avance(130, 40, 40), textos: 0, listening: 15, vida: 5 }));
  assert.ok(listo.every(i => i.hecho));
  const casi = planDeHoy({}, HOY, cuentas({ flashcards: 99, gramatica: avance(60, 19, 19), ejercicios: avance(130, 39, 39), listening: 14, vida: 4 }));
  assert.ok(casi.filter(i => i.id !== 'texts').every(i => !i.hecho), 'a uno de la meta, todavía no');
  assert.equal(casi.find(i => i.id === 'exercises').detalle, '39 / 40 today · 39 / 130 in the unit');
});

test('al final de la unidad la dosis es lo que falta, y no tiene círculo para saltársela', () => {
  const fin = planDeHoy({}, HOY, cuentas({ ejercicios: avance(130, 120, 0) }));
  const e = fin.find(i => i.id === 'exercises');
  assert.equal(e.detalle, '0 / 10 today · 120 / 130 in the unit');
  assert.equal(e.marca, undefined, 'con ejercicios que medir, no se marca a mano');
  const hecha = planDeHoy({}, HOY, cuentas({ ejercicios: avance(130, 130, 10) })).find(i => i.id === 'exercises');
  assert.ok(hecha.hecho);
  assert.equal(hecha.detalle, 'All 130 done in this unit');
});

test('una unidad sin práctica de gramática (solo reglas) la marca él, de hoy y de esa unidad', () => {
  const marcas = { planHoy: { fecha: HOY, hechos: { 'grammar:a2_1': true, listening: true } } };
  const sinPractica = cuentas({ gramatica: avance(0, 0, 0) });
  const g = planDeHoy(marcas, HOY, sinPractica).find(i => i.id === 'grammar');
  assert.equal(g.marca, 'grammar:a2_1');
  assert.ok(g.hecho);
  assert.equal(g.detalle, 'No practice in this unit — review the rules');
  assert.ok(planDeHoy(marcas, HOY, sinPractica).find(i => i.id === 'listening').hecho);
  assert.ok(!planDeHoy(marcas, HOY, { ...sinPractica, unidad: { key: 'a2_2', b1: false } }).find(i => i.id === 'grammar').hecho, 'la de la Unit 1 no marca la 2');
  assert.ok(!planDeHoy(marcas, '2026-11-06', sinPractica).some(i => i.hecho), 'al otro día, todo de nuevo');
  assert.ok(!planDeHoy(marcas, HOY, cuentas()).find(i => i.id === 'grammar').hecho, 'con práctica, la marca vieja no cuenta');
});

test('los textos solo salen si tiene textos en repaso; sin unidad, sin gramática ni ejercicios', () => {
  assert.ok(!planDeHoy({}, HOY, cuentas({ textosEnRepaso: false })).some(i => i.id === 'texts'), 'su compañera no tiene sus textos');
  assert.deepEqual(planDeHoy({}, HOY, cuentas({ unidad: null })).map(i => i.id), ['flash', 'texts', 'listening', 'life']);
});

test('cuenta lo de hoy: respuestas y minutos de podcast', () => {
  assert.equal(hechasHoyEn({ a: { date: HOY }, b: { date: HOY }, c: { date: '2026-11-04' } }, HOY), 2);
  assert.equal(hechasHoyEn(undefined, HOY), 0);
  assert.equal(minutosDeListening({ podcastLog: [{ date: HOY, minutes: 10 }, { date: HOY, minutes: 6 }, { date: '2026-11-04', minutes: 30 }, { date: HOY, minutes: null }] }, HOY), 16);
});

test('con toda la unidad respondida queda anotada para pasar a la siguiente mañana', () => {
  const el = { innerHTML: '' };
  const st = { units: a2(), texts: [], podcastLog: [] };
  const { renderPlanHoy } = h.ejecutar(`${sintaxis}
    ${[...FUNCIONES, 'renderPlanHoy'].map(f => h.extraerFuncion(f)).join('\n')}
    return { renderPlanHoy };`, {
    ...base, state: st, document: { getElementById: id => (id === 'plan-hoy' ? el : null) },
    todayLocal: () => HOY, save: () => {}, repasadasHoy: () => 0, textReviewsDue: () => [],
    textInReview: () => false, vidaHoy: () => 0, escapeHtml: x => String(x),
  });
  renderPlanHoy();
  assert.deepEqual(st.planDiario, { unidad: 'a2_1', desde: HOY, terminada: null }, 'empieza hoy con la Unit 1');
  const u1 = st.units.a2_1;
  u1.drillState = { '0-0': { date: HOY }, '0-1': { date: HOY } };
  u1.exerciseState = { 'fill_blank_answer 1': { date: HOY } };
  renderPlanHoy();
  assert.equal(st.planDiario.terminada, HOY);
  assert.match(el.innerHTML, /All 2 done in this unit/);
  delete u1.exerciseState['fill_blank_answer 1'];
  renderPlanHoy();
  assert.equal(st.planDiario.terminada, null, 'si falta uno, ya no está terminada');
  // Un plan de antes, sin `desde`: empieza a contar hoy.
  st.planDiario = { unidad: 'a2_1', terminada: null };
  renderPlanHoy();
  assert.equal(st.planDiario.desde, HOY);
});

test('arriba en el Dashboard, y cada renglón abre lo suyo', () => {
  const hoy = fuente.indexOf('<div class="section-title dash-section">Today</div>');
  assert.ok(fuente.indexOf('<div id="plan-hoy"></div>', hoy) < fuente.indexOf('<div id="text-review"></div>', hoy), 'lo primero de Today');
  assert.match(h.extraerFuncion('renderDashboard'), /^function renderDashboard\(\) \{\n\s*renderPlanHoy\(\);/);
  // Él pidió un botón "Open" a la vista en cada renglón.
  assert.match(h.extraerFuncion('renderPlanHoy'), /<button class="btn \$\{i\.hecho \? 'btn-ghost' : 'btn-primary'\} btn-sm"[^>]*onclick="abrirDelPlan\('\$\{i\.id\}'\)">Open →<\/button>/);
  const abrir = h.extraerFuncion('abrirDelPlan');
  assert.match(abrir, /if \(id === 'flash'\) return openDailyReview\(\);/);
  // Entra directo a su pestaña: así no dibuja Today para cambiarla enseguida,
  // y suena un solo toque y no tres.
  assert.match(abrir, /openUnit\(lid, Number\(uid\), id\);/);
  assert.doesNotMatch(abrir, /showUnitTab\(id\);/);
  assert.match(abrir, /if \(id === 'listening'\) return navigate\('podcasts'\);/);
  assert.match(abrir, /if \(id === 'life'\) return navigate\('life'\);/);
  assert.match(h.extraerFuncion('marcarPlan'), /if \(!state\.planHoy \|\| state\.planHoy\.fecha !== hoy\) state\.planHoy = \{ fecha: hoy, hechos: \{\} \};/);
});

test('lo que respondió antes de empezar con la unidad se borra solo si él dice que sí', () => {
  const abrir = h.extraerFuncion('abrirDelPlan');
  assert.match(abrir, /if \(viejas\.length && confirm\(`You answered \$\{viejas\.length\} of these before\. Clear them so you can do the whole unit again\?`\)\) \{/);
  assert.match(abrir, /const viejas = Object\.keys\(u\[campo\] \|\| \{\}\)\.filter\(k => !\(u\[campo\]\[k\] && u\[campo\]\[k\]\.date >= desde\)\);/, 'solo las de antes: lo de hoy se queda');
});

test('los textos no salen dos veces: la tarjeta aparece al tocar Open en el plan', () => {
  // "Se debería dejar uno de los dos": el renglón del plan y la tarjeta de
  // abajo decían lo mismo (8 to review).
  const el = { innerHTML: 'vieja' };
  const ventana = {};
  const t = { id: 'a', title: 'U10 · pág 116 - 117', mastered: true, review: { due: HOY } };
  const { renderTextReview } = h.ejecutar(`${h.extraerFuncion('renderTextReview')} return { renderTextReview };`, {
    document: { getElementById: id => (id === 'text-review' ? el : null) }, window: ventana,
    state: { texts: [t] }, todayLocal: () => HOY, textReviewDue: x => x.review.due, textoTocaEl: () => HOY,
    textReviewsDue: () => [t], textosRecordadosHoy: () => [], escapeHtml: x => String(x),
  });
  renderTextReview();
  assert.equal(el.innerHTML, '', 'cerrada hasta que él la abra, aunque haya un texto por repasar');
  ventana.__textosAbiertos = true;
  renderTextReview();
  assert.match(el.innerHTML, /Text review · 1 due today/, 'al tocar Open, la tarjeta de siempre');
  const abrir = h.extraerFuncion('abrirDelPlan');
  assert.match(abrir, /if \(id === 'texts'\) \{\n\s*window\.__textosAbiertos = true;\n\s*renderTextReview\(\);/);
  assert.match(h.extraerFuncion('navigate'), /if \(page !== 'dashboard'\) window\.__textosAbiertos = false;/, 'se cierra al salir del Dashboard');
  assert.match(h.extraerFuncion('markTextReview'), /renderTextReview\(\);\n\s*renderPlanHoy\(\);/, 'el renglón baja con cada texto');
});

test('un toque suyo suena una sola vez, aunque por dentro sean tres llamadas', () => {
  // "Cuando le hundo Open se escucha como si le fuera presionado varias
  // veces": navigate() y los showUnitTab() encadenados sonaban cada uno.
  let sonaron = 0;
  let reloj = 1000;
  const { Sound } = h.ejecutar(`${h.fuente().match(/const Sound = \{[\s\S]*?\n\};/)[0]} return { Sound };`,
    { window: {}, Date: { now: () => reloj } });
  Sound._tone = () => { sonaron++; };
  Sound.tap(); Sound.tap(); Sound.tap();          // la cascada: el mismo tic
  assert.equal(sonaron, 1);
  reloj += 149; Sound.tap();
  assert.equal(sonaron, 1, 'todavía el mismo toque');
  reloj += 1;   Sound.tap();
  assert.equal(sonaron, 2, 'un toque nuevo sí suena');
});

test('openUnit entra a la pestaña que le pidan, y por defecto a Today', () => {
  const abrirUnidad = h.extraerFuncion('openUnit');
  assert.match(abrirUnidad, /^function openUnit\(lid, uid, tab = 'start'\) \{/);
  assert.match(abrirUnidad, /\n  showUnitTab\(tab\);\n  loadUnitContent\(\);/);
});

test('mientras el speaking test check está pendiente, el plan va por las Units 6,9,8,7', () => {
  const u = Object.fromEntries(['a2_6', 'a2_7', 'a2_8', 'a2_9'].map(k => [k, unidad(k)]));
  assert.equal(unidadDelPlan({ units: u, classesDone: [] }, HOY).key, 'a2_6', 'primero el present (Unit 6)');
  assert.equal(unidadDelPlan({ units: u, classesDone: [], planDiario: { unidad: 'a2_6', terminada: HOY } }, '2026-11-06').key, 'a2_9', 'después modales (Unit 9)');
  assert.equal(unidadDelPlan({ units: u, classesDone: [], planDiario: { unidad: 'a2_7', terminada: HOY } }, '2026-11-06').key, 'a2_6', 'tras la última (Unit 7), vuelve a la 6');
  // Marcado el check-0, el plan vuelve al flujo normal (Unit 1 del A2).
  const conU1 = { ...u, a2_1: unidad('a2_1') };
  assert.equal(unidadDelPlan({ units: conU1, classesDone: [1006] }, HOY).key, 'a2_1');
});
