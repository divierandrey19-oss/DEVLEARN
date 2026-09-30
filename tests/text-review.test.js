/**
 * El repaso espaciado de los textos aprendidos.
 *
 * Él se aprendía los textos de una unidad para la clase y, al pasar a la
 * siguiente, se le olvidaban los de la anterior ("tengo que buscar un plan para
 * que no se me olviden los textos de la Unit 9"). Ahora cada texto marcado ✅
 * vuelve cada vez más espaciado: si se lo sabe, tarda más en volver; si se le
 * olvidaron partes, vuelve mañana. Los que ya tenía aprendidos se reparten uno
 * por día, empezando por la unidad más reciente, para no caerle todos de golpe.
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
    ${h.extraerFuncion('scheduleTextReview')}
    ${h.extraerFuncion('textReviewOrder')}
    ${h.extraerFuncion('seedTextReviews')}
    ${h.extraerFuncion('textReviewsDue')}
    ${h.extraerFuncion('textReviewWhen')}
    ${h.extraerFuncion('toggleTextMastered')}
    ${h.extraerFuncion('markTextReview')}
    return { addDaysLocal, scheduleTextReview, seedTextReviews, textReviewsDue,
             textReviewWhen, toggleTextMastered, markTextReview };
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
    texto('u8b', 'U8 · pág 86 - 87'),
    texto('u8a', 'U8 · pág 85'),
    texto('u9c', 'U9 · pág 100 - 101'),
    texto('u9a', 'U9 · pág 97'),
    texto('u9b', 'U9 · pág 98 - 99'),
    texto('u9x', 'U9 · pág 106 - 107', { mastered: false }),
  ];
}

test('se reparten uno por día: la Unit 9 primero, en el orden del libro', () => {
  const { state, seedTextReviews } = montar({ texts: suBiblioteca() });
  assert.equal(seedTextReviews(state.texts, HOY), 7);
  const fecha = id => state.texts.find(t => t.id === id).review.due;
  assert.equal(fecha('u9a'), '2026-09-30', 'la p. 97 hoy');
  assert.equal(fecha('u9b'), '2026-10-01');
  assert.equal(fecha('u9c'), '2026-10-02');
  assert.equal(fecha('u8a'), '2026-10-03', 'luego la Unit 8');
  assert.equal(fecha('u8b'), '2026-10-04');
  assert.equal(fecha('u5'), '2026-10-05');
  assert.equal(fecha('daily'), '2026-10-06', 'lo que no es de una unidad, al final');
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
    texto('atrasado', 'U8 · pág 85', { review: { step: 1, due: '2026-09-28' } }),
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
