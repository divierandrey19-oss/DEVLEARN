/**
 * La limpieza de la gramática que devuelve el análisis de una página.
 *
 * Los ejercicios de cada tema se pedían a la IA como `drillSentences`, pero el
 * filtro conservaba un campo `drills` que la IA nunca manda y descartaba
 * `drillSentences`. Cada página subida llegaba sin ejercicios de gramática y el
 * botón ✨ volvía a pedirlos a la IA: dos llamadas pagadas por lo mismo.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { sanitizeGrammar } = h.ejecutar(`
  ${h.extraerFuncion('sanitizeGrammar')}
  return { sanitizeGrammar };
`, {});

/** Un tema tal como la app se lo pide a la IA (el esquema del prompt de análisis). */
function temaDeLaIA(titulo = 'Past simple for accidents') {
  return {
    title: titulo, source: 'book', level: 'A2',
    explanation: 'Usamos el pasado simple para accidentes.',
    structure: 'I + past verb + my + body part', rule: 'Use the past simple.',
    spanishTrap: 'No uses "me": I broke my arm.',
    examples: [{ en: 'I broke my arm.', es: 'Me rompí el brazo.' }],
    commonErrors: [{ wrong: 'I broke me the arm.', correct: 'I broke my arm.', why: 'Use my.' }],
    drillSentences: [
      { type: 'translation', prompt: 'Me quemé la mano en la cocina.', answer: 'I burned my hand in the kitchen.', hint: 'burn → burned' },
      { type: 'fill_blank', prompt: 'Yesterday I ___ my finger with the scissors.', answer: 'cut', hint: '' },
      { type: 'error_correction', prompt: 'I hurted my back at the shop.', answer: 'I hurt my back at the shop.', hint: 'hurt es irregular' },
    ],
  };
}

test('los ejercicios que manda la IA se conservan', () => {
  const [g] = sanitizeGrammar([temaDeLaIA()]);
  assert.equal(g.drillSentences.length, 3, 'los tres ejercicios deben llegar a guardarse');
  assert.deepEqual(g.drillSentences.map(d => d.type), ['translation', 'fill_blank', 'error_correction']);
  assert.equal(g.drillSentences[1].answer, 'cut');
  assert.equal(g.drillSentences[0].hint, 'burn → burned', 'la pista también, que la pestaña Grammar la muestra');
});

test('con ejercicios guardados, la página ya no se marca como incompleta', () => {
  // La misma cuenta que hace la app después de analizar una página.
  const grammar = sanitizeGrammar([temaDeLaIA('A'), temaDeLaIA('B')]);
  const sinDrills = grammar.filter(g => !(g.drillSentences || []).length).length;
  assert.equal(sinDrills, 0, 'no debe quedar ningún tema para el botón ✨');
});

test('un ejercicio sin enunciado o sin respuesta se descarta', () => {
  const t = temaDeLaIA();
  t.drillSentences = [
    { type: 'translation', prompt: '', answer: 'x' },
    { type: 'fill_blank', prompt: 'I ___ it.', answer: '' },
    null, 'texto suelto',
    { type: 'fill_blank', prompt: 'I ___ my leg.', answer: 'broke' },
  ];
  const [g] = sanitizeGrammar([t]);
  assert.deepEqual(g.drillSentences.map(d => d.answer), ['broke']);
});

test('un tipo desconocido se guarda como traducción, y se guardan tres como máximo', () => {
  const t = temaDeLaIA();
  t.drillSentences = Array.from({ length: 5 }, (_, i) => ({ type: 'rarísimo', prompt: `p${i}`, answer: `a${i}` }));
  const [g] = sanitizeGrammar([t]);
  assert.equal(g.drillSentences.length, 3);
  assert.ok(g.drillSentences.every(d => d.type === 'translation'));
});

test('un tema sin ejercicios sigue guardándose, con la lista vacía', () => {
  // Es el caso para el que existe el botón ✨: la IA de verdad no los mandó.
  const t = temaDeLaIA();
  delete t.drillSentences;
  const [g] = sanitizeGrammar([t]);
  assert.equal(g.title, 'Past simple for accidents');
  assert.deepEqual(g.drillSentences, []);
});

test('el resto del tema se limpia como antes', () => {
  const [g] = sanitizeGrammar([{ ...temaDeLaIA(), source: 'inventado' }]);
  assert.equal(g.source, 'derived', 'solo "book" explícito reclama la autoridad del libro');
  assert.deepEqual(g.examples, [{ en: 'I broke my arm.', es: 'Me rompí el brazo.' }]);
  assert.equal(g.commonErrors.length, 1);
  assert.equal(g.spanishTrap, 'No uses "me": I broke my arm.');
});

test('temas repetidos, vacíos o basura no pasan', () => {
  const lista = sanitizeGrammar([temaDeLaIA('Past simple'), temaDeLaIA('past simple!'), { title: '' }, null, 'x']);
  assert.equal(lista.length, 1);
  assert.deepEqual(sanitizeGrammar(undefined), []);
  assert.deepEqual(sanitizeGrammar('no es una lista'), []);
});

test('el análisis de páginas usa este filtro', () => {
  const fuente = h.fuente();
  const inicio = fuente.indexOf('async _analyzeReal(');
  const fin = fuente.indexOf('_parseClaudeJSON(raw) {', inicio);
  assert.ok(inicio > 0 && fin > inicio, 'no se encontró _analyzeReal');
  assert.match(fuente.slice(inicio, fin), /parsed\.grammar = sanitizeGrammar\(parsed\.grammar\);/);
});

test('nada vuelve a guardar el campo muerto `drills`', () => {
  assert.doesNotMatch(h.extraerFuncion('sanitizeGrammar'), /\bdrills:/,
    '`drills` no lo lee nadie: guardarlo en vez de drillSentences es el fallo original');
});
