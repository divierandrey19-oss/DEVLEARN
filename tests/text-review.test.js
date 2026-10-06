/**
 * El repaso espaciado de los textos aprendidos.
 *
 * Él se aprendía los textos de una unidad para la clase y, al pasar a la
 * siguiente, se le olvidaban los de la anterior ("tengo que buscar un plan para
 * que no se me olviden los textos de la Unit 9"). Ahora cada texto marcado ✅
 * vuelve cada vez más espaciado: si se lo sabe, tarda más en volver; si se le
 * olvidaron partes, vuelve mañana. Solo las Units 9 y 10, las que más le sirven
 * para el speaking (lo pidió él). Los que ya tenía aprendidos se reparten uno
 * por día, de la última página hacia atrás, para no caerle todos de golpe.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const HOY = '2026-09-30';

function montar({ texts = [], hoy = HOY } = {}) {
  const state = { texts };
  const f = h.ejecutar(`
    ${h.extraerFuncion('dateLocal')}
    ${h.extraerFuncion('textReviewIntervals')}
    ${h.extraerFuncion('addDaysLocal')}
    ${h.extraerFuncion('startTextReview')}
    ${h.extraerFuncion('textInReview')}
    ${h.extraerFuncion('textReviewDue')}
    ${h.extraerFuncion('scheduleTextReview')}
    ${h.extraerFuncion('textReviewOrder')}
    ${h.extraerFuncion('seedTextReviews')}
    ${h.extraerFuncion('textReviewsDue')}
    ${h.extraerFuncion('textReviewWhen')}
    ${h.extraerFuncion('toggleTextMastered')}
    ${h.extraerFuncion('markTextReview')}
    ${h.extraerFuncion('textosRecordadosHoy')}
    return { addDaysLocal, scheduleTextReview, seedTextReviews, textReviewsDue,
             textReviewWhen, toggleTextMastered, markTextReview, textosRecordadosHoy };
  `, { state, todayLocal: () => hoy, save() {}, renderTexts() {}, renderTextReview() {}, toast() {} });
  return { ...f, state };
}

const texto = (id, title, extra = {}) => ({ id, title, body: 'x', ts: 1, mastered: true, ...extra });

// ---------------------------------------------------------------------------
// Marcar y repasar.
// ---------------------------------------------------------------------------

test('marcar un texto como aprendido lo programa para mañana', () => {
  const { state, toggleTextMastered } = montar({ texts: [texto('a', 'U9 · pág 97', { mastered: false })] });
  toggleTextMastered('a');
  assert.deepEqual(state.texts[0].review, { step: 0, due: '2026-10-01', last: HOY });
});

test('desmarcarlo lo saca del repaso', () => {
  const { state, toggleTextMastered } = montar({ texts: [texto('a', 'U9 · pág 97')] });
  toggleTextMastered('a');   // vuelve a pendiente
  assert.equal(state.texts[0].mastered, false);
  assert.equal(state.texts[0].review, undefined);
});

test('si se lo sabe, cada repaso tarda más en volver: 3, 7, 14, 30, 60 días', () => {
  const { state, markTextReview } = montar({ texts: [texto('a', 'U9 · pág 97', { review: { step: 0, due: HOY, last: null } })] });
  const esperados = [3, 7, 14, 30, 60, 60];
  for (const dias of esperados) {
    markTextReview('a', true);
    const r = state.texts[0].review;
    assert.equal(r.due, montar().addDaysLocal(HOY, dias), `se esperaba volver en ${dias} días`);
    assert.equal(r.last, HOY);
  }
  assert.equal(state.texts[0].review.step, 5, 'no pasa del último intervalo');
});

test('si se le olvidaron partes, vuelve mañana y empieza de nuevo', () => {
  const { state, markTextReview } = montar({ texts: [texto('a', 'U9 · pág 97', { review: { step: 4, due: HOY, last: null } })] });
  markTextReview('a', false);
  assert.deepEqual(state.texts[0].review, { step: 0, due: '2026-10-01', last: HOY });
});

test('un texto de otra unidad se marca ✅ pero no entra al repaso', () => {
  const { state, toggleTextMastered } = montar({ texts: [texto('a', 'U7 · pág 73', { mastered: false })] });
  toggleTextMastered('a');
  assert.equal(state.texts[0].mastered, true);
  assert.equal(state.texts[0].review, undefined);
});

test('un texto pendiente no se puede marcar como repasado', () => {
  const { state, markTextReview } = montar({ texts: [texto('a', 'U9 · pág 97', { mastered: false })] });
  markTextReview('a', true);
  assert.equal(state.texts[0].review, undefined);
});

test('las fechas cruzan de mes y de año bien', () => {
  const { addDaysLocal } = montar();
  assert.equal(addDaysLocal('2026-09-30', 1), '2026-10-01');
  assert.equal(addDaysLocal('2026-12-20', 14), '2027-01-03');
});

// ---------------------------------------------------------------------------
// Los que ya tenía aprendidos.
// ---------------------------------------------------------------------------

function suBiblioteca() {
  return [
    texto('daily', 'Daily speaking training'),
    texto('u5', 'U5 · pág 49'),
    texto('u8', 'U8 · pág 85'),
    texto('u9c', 'U9 · pág 100 - 101'),
    texto('u9a', 'U9 · pág 97'),
    texto('u9b', 'U9 · pág 98 - 99'),
    texto('u9x', 'U9 · pág 106 - 107', { mastered: false }),
    texto('u10a', 'U10 · pág 109'),
  ];
}

test('se reparten uno por día, de la última página hacia atrás', () => {
  const { state, seedTextReviews } = montar({ texts: suBiblioteca() });
  assert.equal(seedTextReviews(state.texts, HOY), 4);
  const fecha = id => state.texts.find(t => t.id === id).review.due;
  assert.equal(fecha('u10a'), '2026-09-30', 'la Unit 10 hoy');
  assert.equal(fecha('u9c'), '2026-10-01', 'luego la Unit 9 desde su última página');
  assert.equal(fecha('u9b'), '2026-10-02');
  assert.equal(fecha('u9a'), '2026-10-03', 'la p. 97 al final');
});

test('solo entran las Units 9 y 10: las demás no se repasan', () => {
  const { state, seedTextReviews } = montar({ texts: suBiblioteca() });
  seedTextReviews(state.texts, HOY);
  for (const id of ['daily', 'u5', 'u8']) {
    assert.equal(state.texts.find(t => t.id === id).review, undefined, `${id} no debía entrar`);
  }
});

test('los pendientes no entran al repaso', () => {
  const { state, seedTextReviews } = montar({ texts: suBiblioteca() });
  seedTextReviews(state.texts, HOY);
  assert.equal(state.texts.find(t => t.id === 'u9x').review, undefined);
});

test('correrlo en cada arranque no mueve nada ya programado', () => {
  const { state, seedTextReviews } = montar({ texts: suBiblioteca() });
  seedTextReviews(state.texts, HOY);
  const antes = JSON.stringify(state.texts);
  assert.equal(seedTextReviews(state.texts, '2026-10-05'), 0);
  assert.equal(JSON.stringify(state.texts), antes);
});

test('un texto con su repaso ya avanzado no se toca', () => {
  const avanzado = { step: 3, due: '2026-10-20', last: '2026-10-06' };
  const { state, seedTextReviews } = montar({ texts: [texto('a', 'U9 · pág 97', { review: { ...avanzado } })] });
  seedTextReviews(state.texts, HOY);
  assert.deepEqual(state.texts[0].review, avanzado);
});

test('lo que toca hoy: lo atrasado primero, sin lo futuro ni lo pendiente', () => {
  const { textReviewsDue } = montar();
  const lista = [
    texto('hoy', 'U9 · pág 98 - 99', { review: { step: 0, due: HOY } }),
    texto('atrasado', 'U10 · pág 109', { review: { step: 1, due: '2026-09-28' } }),
    texto('otraUnidad', 'U8 · pág 85', { review: { step: 0, due: HOY } }),
    texto('manana', 'U9 · pág 97', { review: { step: 0, due: '2026-10-01' } }),
    texto('pendiente', 'U9 · pág 100 - 101', { mastered: false, review: { step: 0, due: HOY } }),
  ];
  assert.deepEqual(textReviewsDue(lista, HOY).map(t => t.id), ['atrasado', 'hoy']);
});

test('cuándo le toca, dicho en palabras', () => {
  const { textReviewWhen } = montar();
  assert.equal(textReviewWhen(HOY, HOY), 'today');
  assert.equal(textReviewWhen('2026-09-29', HOY), 'today');
  assert.equal(textReviewWhen('2026-10-01', HOY), 'tomorrow');
  assert.equal(textReviewWhen('2026-10-07', HOY), 'in 7 days');
});

// ---------------------------------------------------------------------------
// Conectado a la app.
// ---------------------------------------------------------------------------

test('el arranque reparte los que no tienen fecha', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /\n  seedTextReviews\(merged\.texts, todayLocal\(\)\);\n/);
});

test('el Dashboard muestra el texto que toca hoy', () => {
  const fuente = h.fuente();
  assert.match(fuente, /<div id="text-review"><\/div>/);
  assert.match(h.extraerFuncion('renderDashboard'), /\n  renderTextReview\(\);\n/);
  const tarjeta = h.extraerFuncion('renderTextReview');
  assert.match(tarjeta, /markTextReview\('\$\{t\.id\}', true\)/);
  assert.match(tarjeta, /markTextReview\('\$\{t\.id\}', false\)/);
});

// ── Tocó "I remembered it" por error (6 de octubre) ────────────────────────

test('el que marcó "I remembered it" hoy queda a la vista, y se puede cambiar a "I forgot parts"', () => {
  const t = { id: 'a', title: 'U10 · pág 112 - 113', mastered: true, review: { step: 1, due: HOY, last: '2026-09-27' } };
  const otro = { id: 'b', title: 'U9 · pág 100 - 101', mastered: true, review: { step: 0, due: HOY, last: null } };
  const m = montar({ texts: [t, otro] });
  assert.deepEqual(m.textosRecordadosHoy(m.state.texts, HOY), []);
  m.markTextReview('a', true);
  assert.deepEqual(m.textosRecordadosHoy(m.state.texts, HOY).map(x => x.title), ['U10 · pág 112 - 113'], 'ya sabe cuál fue');
  m.markTextReview('a', false);
  assert.equal(t.review.due, '2026-10-01', 'vuelve mañana');
  assert.equal(t.review.step, 0);
  assert.deepEqual(m.textosRecordadosHoy(m.state.texts, HOY), [], 'corregido, ya no sale');
  m.markTextReview('b', false);
  assert.deepEqual(m.textosRecordadosHoy(m.state.texts, HOY), [], '"I forgot parts" no sale: no hay nada que corregir');
});

test('la tarjeta del Dashboard muestra los de hoy con Open e I forgot parts, haya o no algo pendiente', () => {
  const tarjeta = h.extraerFuncion('renderTextReview');
  assert.match(tarjeta, /const marcados = textosRecordadosHoy\(state\.texts, hoy\)/);
  assert.match(tarjeta, /onclick="markTextReview\('\$\{m\.id\}', false\)">↩ I forgot parts</);
  assert.match(tarjeta, /onclick="openText\('\$\{m\.id\}'\)">▶ Open</);
  assert.equal(tarjeta.split('${marcados}').length - 1, 2, 'con algo pendiente y sin nada pendiente');
});
