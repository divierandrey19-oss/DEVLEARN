/**
 * La corrección de gramática, ejercicios y speaking de las pp. 109-111.
 *
 * Revisados contra las fotos (su respaldo del 29 de septiembre): en la p. 109
 * dos tareas de speaking eran los títulos de las lecciones 3 y 4, en la p. 110
 * la "trampa del español" del if era falsa y un error común daba por correcta
 * la frase contraria a la de Sophie, y había traducciones literales y
 * ejercicios con contexto sin sentido. Él pidió corregirlo a mano.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const f = h.ejecutar(`
  ${h.extraerFuncion('fixPageContent')}
  ${h.extraerFuncion('fixU10P109Content')}
  ${h.extraerFuncion('fixU10P110Content')}
  ${h.extraerFuncion('fixU10P111Content')}
  return { fixU10P109Content, fixU10P110Content, fixU10P111Content };
`, {});

// Lo que dejó el análisis, copiado de su respaldo.
function unidades() {
  return { a2_10: { batches: [
    { pages: [109], vocab: [{ word: 'dream' }],
      grammar: [{ title: 'What + makes + object + adjective',
        spanishTrap: "Spanish speakers might say 'What make' because in Spanish '¿Qué hacen?' uses plural, but in English 'what' always takes singular verb form.",
        examples: [{ en: 'Discuss what makes a job attractive.', es: 'Hablar sobre qué hace un trabajo atractivo.' }],
        drillSentences: [{ type: 'translation', prompt: '¿Qué hace una vida saludable?', answer: 'What makes a healthy life?' }] }],
      exercises: [{ type: 'fill_blank', question: "I ___ I'd like to live a long, healthy life. She told me yesterday that she wants kids.", answer: 'guess' }],
      speakingPrompts: ['Which of the three life goals do you find the most appealing? Why?',
        'Discuss what makes a job attractive.', 'Describe ways to make a dream come true.'] },
    { pages: [110], vocab: [],
      grammar: [
        { title: "Using 'if' for conditions with present tense",
          spanishTrap: "Spanish uses subjunctive after 'si' in some contexts, but English NEVER uses subjunctive after 'if' in these general conditions - always use present simple." },
        { title: "Negative imperatives with 'Don't'",
          commonErrors: [{ wrong: "Don't to keep your ideas to yourself.", correct: "Don't keep your ideas to yourself.", why: "Use base form after 'Don't' - never add 'to'." }] },
      ],
      exercises: [], speakingPrompts: ['Compare your choices. Support your choices with examples from your life or the news.'] },
  ] } };
}

test('p. 109: se quitan las tareas de speaking que eran títulos de lecciones', () => {
  const u = unidades();
  assert.equal(f.fixU10P109Content(u), true);
  assert.deepEqual(u.a2_10.batches[0].speakingPrompts, ['Which of the three life goals do you find the most appealing? Why?']);
  // Como ejemplo de gramática sí sirve: está impreso en la página.
  assert.equal(u.a2_10.batches[0].grammar[0].examples[0].en, 'Discuss what makes a job attractive.');
  assert.equal(u.a2_10.batches[0].grammar[0].examples[0].es, 'Hablar sobre qué hace que un trabajo sea atractivo.');
});

test('p. 109: las traducciones de "What makes…" dicen lo mismo que el inglés', () => {
  const u = unidades();
  f.fixU10P109Content(u);
  const d = u.a2_10.batches[0].grammar[0].drillSentences[0];
  assert.equal(d.prompt, '¿Qué hace que una vida sea saludable?');
  assert.equal(d.answer, 'What makes a life healthy?');
  assert.doesNotMatch(u.a2_10.batches[0].exercises[0].question, /She told me yesterday/);
});

test('p. 110: la trampa del if ya no dice que en español va subjuntivo', () => {
  const u = unidades();
  assert.equal(f.fixU10P110Content(u), true);
  const trampa = u.a2_10.batches[1].grammar[0].spanishTrap;
  assert.doesNotMatch(trampa, /subjunctive after 'si'/);
  assert.match(trampa, /'If you will work hard' ✗ → 'If you work hard' ✓/);
});

test('p. 110: ningún error común da por correcta la frase contraria a Sophie', () => {
  const u = unidades();
  f.fixU10P110Content(u);
  const e = u.a2_10.batches[1].grammar[1].commonErrors[0];
  assert.equal(e.correct, "Don't let anyone tell you you can't succeed.");
  assert.notEqual(e.correct, "Don't keep your ideas to yourself.");
});

test('no toca el vocabulario, lo que él editó, ni un aparato sin la página', () => {
  const u = unidades();
  u.a2_10.batches[0].exercises[0].question = 'Mi propia pregunta';
  f.fixU10P109Content(u);
  assert.equal(u.a2_10.batches[0].exercises[0].question, 'Mi propia pregunta');
  assert.deepEqual(u.a2_10.batches[0].vocab, [{ word: 'dream' }]);
  assert.equal(f.fixU10P111Content(u), false, 'la p. 111 no está en este aparato');
  const m = h.extraerFuncion('migrateState');
  for (const p of ['109', '110', '111']) {
    assert.match(m, new RegExp(`if \\(!merged\\._u10P${p}ContentV1 && fixU10P${p}Content\\(merged\\.units\\)\\) merged\\._u10P${p}ContentV1 = true;`));
  }
});
