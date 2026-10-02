/**
 * Preguntas para el roleplay, por página.
 *
 * Él es flojo para preguntar y pidió, en cada página, las preguntas que puede
 * hacer en un roleplay: del tema del libro (no de sus textos), abiertas más
 * las de sí o no que el roleplay usa. Van en su propio mazo, separadas de las
 * palabras: no se cruzan con la limpieza de repetidas ni inflan pendientes.
 * La tarjeta es pregunta en inglés → qué significa y una respuesta de ejemplo
 * (lo eligió él). Primero la p. 109, para ver cómo quedaba; después 110 y 111.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const NOMBRES = ['addU10P109Questions', 'addU10P110Questions', 'addU10P111Questions', 'addU10P112Questions', 'addU10P113Questions'];
const f = h.ejecutar(`${['addPageQuestions', ...NOMBRES].map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});
const add = f.addU10P109Questions;
const unidad = () => ({ a2_10: { batches: [{ id: 'p109', pages: [109], vocab: [{ word: 'life goal' }] }] } });

test('la p. 109 recibe sus preguntas, aparte del vocabulario', () => {
  const units = unidad();
  assert.equal(add(units), true);
  const b = units.a2_10.batches[0];
  assert.ok(b.questions.length >= 5);
  assert.deepEqual(b.vocab, [{ word: 'life goal' }], 'el vocabulario no se toca');
  for (const x of b.questions) {
    assert.match(x.q, /\?$/, `"${x.q}" no es pregunta`);
    assert.ok(x.es && x.a, `"${x.q}" sin traducción o sin respuesta de ejemplo`);
  }
});

test('casi todas abiertas, del tema de la página', () => {
  const units = unidad();
  add(units);
  const qs = units.a2_10.batches[0].questions.map(x => x.q);
  const abiertas = qs.filter(q => /^(What|Which|Why|How|Where|When|Who)\b/.test(q));
  assert.ok(abiertas.length >= qs.length - 2, 'las de sí o no son pocas');
  assert.ok(qs[0].startsWith('Which of the three life goals do you find the most appealing?'), 'la primera es la del Warm-Up');
  assert.ok(qs.every(q => /life goal|goal|kids|money|healthy life/.test(q)), 'todas del tema de la página');
});

test('si él ya tiene preguntas en esa página, no se pisan; sin la página, nada', () => {
  const units = unidad();
  units.a2_10.batches[0].questions = [{ q: 'Mine?', es: 'mía', a: 'x' }];
  add(units);
  assert.deepEqual(units.a2_10.batches[0].questions, [{ q: 'Mine?', es: 'mía', a: 'x' }]);
  assert.equal(add({ a2_10: { batches: [] } }), false);
});

test('el arranque y la restauración de páginas las agregan; la hoja de la página tiene el botón', () => {
  assert.match(h.extraerFuncion('migrateState'), /if \(!merged\._u10P109QuestionsV1 && addU10P109Questions\(merged\.units\)\) merged\._u10P109QuestionsV1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /\baddU10P109Questions\b/);
  assert.match(h.extraerFuncion('openPageSheet'), /practicePageQuestions\('\$\{escapeStr\(batchId\)\}'\)/);
});

test('pp. 110 y 111: sus preguntas, del tema de cada página', () => {
  const units = { a2_10: { batches: [{ id: 'a', pages: [110], vocab: [] }, { id: 'b', pages: [111], vocab: [] }] } };
  assert.equal(f.addU10P110Questions(units), true);
  assert.equal(f.addU10P111Questions(units), true);
  const [p110, p111] = units.a2_10.batches.map(b => b.questions);
  assert.equal(p110[0].q, 'What makes people successful?', 'la del título de la página');
  assert.ok(p111.some(x => /grab a bite/.test(x.q)) && p111.some(x => /call it a day/.test(x.q)), 'con las expresiones del diálogo');
  for (const x of [...p110, ...p111]) {
    assert.match(x.q, /\?$/, `"${x.q}" no es pregunta`);
    assert.ok(x.es && x.a, `"${x.q}" sin traducción o sin respuesta de ejemplo`);
  }
});

test('el arranque y la restauración agregan también las de 110 y 111', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /if \(!merged\._u10P110QuestionsV1 && addU10P110Questions\(merged\.units\)\) merged\._u10P110QuestionsV1 = true;/);
  assert.match(migrar, /if \(!merged\._u10P111QuestionsV1 && addU10P111Questions\(merged\.units\)\) merged\._u10P111QuestionsV1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /addU10P110Questions, addU10P111Questions/);
});

test('pp. 112 y 113: would like, con las preguntas del cuadro y del Conversation Model', () => {
  const units = { a2_10: { batches: [{ id: 'a', pages: [112], vocab: [] }, { id: 'b', pages: [113], vocab: [] }] } };
  assert.equal(f.addU10P112Questions(units), true);
  assert.equal(f.addU10P113Questions(units), true);
  const [p112, p113] = units.a2_10.batches.map(b => b.questions);
  assert.ok(p112.every(x => /would/i.test(x.q)), 'todas con would');
  assert.ok(p112.some(x => x.q === 'Who would like to get rich?'), 'Who como sujeto, sin "you"');
  assert.ok(p113.some(x => x.q === 'What do you mean?'), 'la del Social language');
  for (const x of [...p112, ...p113]) {
    assert.match(x.q, /\?$/, `"${x.q}" no es pregunta`);
    assert.ok(x.es && x.a, `"${x.q}" sin traducción o sin respuesta de ejemplo`);
  }
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /merged\._u10P112QuestionsV1 = true;/);
  assert.match(migrar, /merged\._u10P113QuestionsV1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /addU10P112Questions, addU10P113Questions/);
});
