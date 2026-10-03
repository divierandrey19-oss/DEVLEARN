/**
 * Unit 10, pp. 114-119, subidas el 3 de octubre con el prompt nuevo. Salieron
 * bien; solo detalles:
 *
 * - p. 117: "Positive thinking isn't going to help your dreams come true" es una
 *   de las frases que NO dicen lo que piensa el escritor, y "I don't always stay
 *   positive" contaba algo de él.
 * - pp. 116 y 118: respuestas que inventaban lo que a él le importa o en qué es
 *   bueno.
 * - p. 115: un ejercicio con dos respuestas incorrectas y "Change partners".
 * - p. 114: una explicación rara en español y "invite the company".
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const F = ['fixU10P114', 'fixU10P115', 'fixU10P116', 'fixU10P117', 'fixU10P118'];
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', ...F];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const q = (word, example) => w(word, example, { type: 'question', exampleTranslation: '' });
const lote = (p, extra) => ({ id: `b_${p}`, pages: [p], vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...extra });

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  116: 'Dream big! Find your passion Target your weaknesses Stay positive! Learn from your mistakes and failures',
  117: "Positive thinking isn't going to help your dreams come true. Complete two statements about your weaknesses: I sometimes think I . . . I don't always . . . I could be more . . .",
  118: 'a challenge a salary a perk feedback flexible hours the atmosphere',
};
const palabras = t => new Set(t.toLowerCase().match(/[a-z']+/g));

function unidad() {
  return { a2_10: { fcProgress: { 'I could be more...': { interval: 3 } }, batches: [
    lote(114, { vocab: [q('Who are they going to invite to the event?', "They're going to invite the company.")],
      grammar: [{ title: 'Present continuous for future plans (except be)',
        explanation: "El presente continuo también expresa planes futuros, como en español 'Mañana voy saliendo' no se usa, pero sí 'I'm coming home' = 'Voy a volver a casa'. Funciona con todos los verbos excepto 'be': para 'be' hay que usar 'going to be'." }] }),
    lote(115, { exercises: [{ type: 'multiple_choice', question: 'Which answer is INCORRECT after "Is anyone going to set up the room?"', answer: 'No worries yes.' },
        { type: 'fill_blank', question: 'A: What are you going to bring to the party? B: Actually, I\'m not sure __.', answer: 'yet' }],
      speakingPrompts: ['CONVERSATION PAIR WORK: Role-play the conversation. Then change roles.', 'CHANGE PARTNERS: Role-play the conversation again.'] }),
    lote(116, { vocab: [w('be good at', "If you'd like to change careers, think about what you're really good at.", { exampleTranslation: 'Si te gustaría cambiar de carrera, piensa en lo que realmente eres bueno.' }),
      q('Which ideas seem the most helpful to you?', '"Stay positive!" and "Learn from your mistakes and failures."'),
      q('What are you really good at?', "I'm really good at decorating.")] }),
    lote(117, { vocab: [w('positive thinking', "Positive thinking isn't going to help your dreams come true."),
      w('I could be more...', 'I could be more hard-working.'), w("I don't always...", "I don't always stay positive.")] }),
    lote(118, { vocab: [q('Which job benefits are important to you?', 'Flexible hours and feedback are important to me.')] }),
  ] } };
}

function corregida() {
  const units = unidad();
  for (const n of F) assert.equal(f[n](units), true, n);
  return units;
}
const pagina = (units, n) => units.a2_10.batches.find(b => b.pages[0] === n);
const tarjeta = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);

test('nada inventado sobre él; la frase falsa del escritor queda marcada', () => {
  const units = corregida();
  for (const v of units.a2_10.batches.flatMap(b => b.vocab)) {
    assert.doesNotMatch(v.example, /I don't always stay positive|I could be more hard-working|important to me|good at decorating|invite the company/, v.word);
  }
  assert.match(tarjeta(units, 117, 'positive thinking').example, /Not the writer's opinion/);
  assert.equal(tarjeta(units, 116, 'What are you really good at?'), undefined);
  assert.deepEqual(units.a2_10.fcProgress, { 'I could be more...': { interval: 3 } }, 'la tarjeta y su progreso se quedan');
});

test('los ejemplos nuevos usan solo palabras de la página', () => {
  const units = corregida();
  for (const [n, word] of [[116, 'Which ideas seem the most helpful to you?'], [117, 'I could be more...'], [118, 'Which job benefits are important to you?']]) {
    const impresas = palabras(IMPRESO[n]);
    for (const p of palabras(tarjeta(units, n, word).example)) assert.ok(impresas.has(p), `p. ${n}: "${p}"`);
  }
});

test('p. 115: sin el ejercicio de dos respuestas ni "Change partners"; p. 114: la explicación en buen español', () => {
  const units = corregida();
  assert.deepEqual(pagina(units, 115).exercises.map(e => e.answer), ['yet']);
  assert.deepEqual(pagina(units, 115).speakingPrompts, ['CONVERSATION PAIR WORK: Role-play the conversation. Then change roles.']);
  assert.doesNotMatch(pagina(units, 114).grammar[0].explanation, /voy saliendo/);
  assert.match(tarjeta(units, 116, 'be good at').exampleTranslation, /en qué eres realmente bueno/);
});

test('sin la página, nada; correrlo otra vez no cambia nada; el arranque las corre', () => {
  const units = corregida();
  const una = JSON.stringify(units);
  for (const n of F) f[n](units);
  assert.equal(JSON.stringify(units), una);
  for (const n of F) assert.equal(f[n]({ a2_10: { batches: [] } }), false, n);
  const migrar = h.extraerFuncion('migrateState'), aplicar = h.extraerFuncion('applyPageFixes');
  for (const n of [114, 115, 116, 117, 118]) {
    assert.match(migrar, new RegExp(`\\['_u10P${n}V1', fixU10P${n}\\]`));
    assert.match(aplicar, new RegExp(`\\bfixU10P${n}\\b`));
  }
});
