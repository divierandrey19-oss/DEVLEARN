/**
 * La Unit 3 (su respaldo del 2 de octubre). En mayo subió 8 de sus 11
 * páginas; el 2 de octubre les puso la foto a esas 8 y subió las que faltaban
 * (25, 27 y 28), que quedaron al final de la cuadrícula: 26, 29… 35, 25, 27,
 * 28. Él pidió que quedaran en el orden del libro.
 *
 * El orden corre en cada arranque, sin bandera: la nube junta los lotes en el
 * orden que ella trae, y una copia vieja (de un aparato con la versión
 * anterior) volvería a dejarlos salteados. Ordenar lo que ya está en orden no
 * cambia nada.
 *
 * Las 8 viejas se analizaron antes de que existieran las preguntas: aquí
 * reciben las suyas, primero las que el libro imprime, con su respuesta.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const VIEJAS = [26, 29, 30, 31, 32, 33, 34, 35];
const NOMBRES = ['sanitizePageNumbers', 'vocabKey', 'questionCard', 'addQuestionCards', 'addPageExtras', 'u3Lote',
  'ordenarPorPagina', 'fixU3Order', ...VIEJAS.map(n => `addU3P${n}Extras`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const lote = (pagina, extra = {}) => ({ id: f.u3Lote(pagina) || `nuevo_${pagina}`, pages: [pagina], images: [`foto${pagina}`],
  vocab: [{ word: `palabra${pagina}`, translation: 't' }], ...extra });
const unidad = () => ({ a2_3: { fcProgress: { palabra26: { interval: 82 } },
  batches: [...VIEJAS.map(p => lote(p)), lote(25), lote(27), lote(28)] } });
const orden = units => units.a2_3.batches.map(b => b.pages[0]);

test('las 11 páginas quedan en el orden del libro, cada una con su foto y sus tarjetas', () => {
  const units = unidad();
  assert.deepEqual(orden(units), [26, 29, 30, 31, 32, 33, 34, 35, 25, 27, 28]);
  assert.equal(f.fixU3Order(units), true);
  assert.deepEqual(orden(units), [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  for (const b of units.a2_3.batches) {
    assert.deepEqual([b.images, b.vocab[0].word], [[`foto${b.pages[0]}`], `palabra${b.pages[0]}`]);
  }
  assert.deepEqual(units.a2_3.fcProgress, { palabra26: { interval: 82 } }, 'el progreso no se toca');
});

test('una página sin número queda al final, sin cambiar el orden de las demás', () => {
  const units = unidad();
  units.a2_3.batches.splice(3, 0, { id: 'sin', images: [], vocab: [] }, { id: 'sin2', pages: [], vocab: [] });
  f.fixU3Order(units);
  assert.deepEqual(units.a2_3.batches.slice(-2).map(b => b.id), ['sin', 'sin2']);
  assert.deepEqual(orden({ a2_3: { batches: units.a2_3.batches.slice(0, -2) } }), [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  assert.equal(f.fixU3Order({}), false);
  assert.equal(f.fixU3Order({ a2_3: { batches: [] } }), false);
});

test('ordenar otra vez no cambia nada', () => {
  const units = unidad();
  f.fixU3Order(units);
  const una = JSON.stringify(units);
  f.fixU3Order(units);
  assert.equal(JSON.stringify(units), una);
});

test('corre en cada arranque (sin bandera) y al recuperar páginas de un respaldo', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /\n {2}fixU3Order\(merged\.units\);\n/);
  assert.doesNotMatch(migrar, /_u3OrderV1/, 'con bandera, una copia vieja de la nube volvería a dejarlas salteadas');
  assert.match(h.extraerFuncion('applyPageFixes'), /\bfixU3Order\b/);
});

test('las 8 páginas viejas reciben sus preguntas, sin repetir las de la unidad', () => {
  const units = unidad();
  // La p. 28 (nueva) ya trae "Can you draw?": no se repite.
  units.a2_3.batches.find(b => b.pages[0] === 28).vocab.push({ word: 'Can you drive?', translation: '¿Sabes manejar?', type: 'question' });
  for (const n of VIEJAS) assert.equal(f[`addU3P${n}Extras`](units), true, `p. ${n}`);
  for (const n of VIEJAS) {
    const q = units.a2_3.batches.find(b => b.pages[0] === n).vocab.filter(v => v.type === 'question');
    assert.ok(q.length >= 3, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  assert.ok(!units.a2_3.batches.find(b => b.pages[0] === 26).vocab.some(v => v.word === 'Can you drive?'));
  const claves = units.a2_3.batches.flatMap(b => b.vocab.map(v => f.vocabKey(v.word)));
  assert.equal(new Set(claves).size, claves.length);
  const una = JSON.stringify(units);
  for (const n of VIEJAS) f[`addU3P${n}Extras`](units);
  assert.equal(JSON.stringify(units), una, 'correrlo otra vez no cambia nada');
});

test('las respuestas de las preguntas impresas son las del libro', () => {
  const units = unidad();
  for (const n of VIEJAS) f[`addU3P${n}Extras`](units);
  const r = q => units.a2_3.batches.flatMap(b => b.vocab).find(v => v.word === q).example;
  assert.equal(r('What instruments can you play?'), 'The piano and the guitar.');
  assert.equal(r("Why can't we go swimming today?"), 'Because the weather is too cold.');
  assert.equal(r("You don't look so good. What's wrong?"), 'Actually, I feel horrible. I have a headache and a sore throat.');
  assert.equal(r("So how do you feel when you're home with no plans?"), 'Me? I feel sad.');
  assert.match(r('Can you cook?'), /^I can cook pretty well\. I don't have natural ability, but I practice a lot\./);
});

test('sin la página, nada (y no marca la bandera)', () => {
  for (const n of VIEJAS) assert.equal(f[`addU3P${n}Extras`]({ a2_3: { batches: [] } }), false);
  const migrar = h.extraerFuncion('migrateState');
  for (const n of VIEJAS) {
    assert.match(migrar, new RegExp(`if \\(!merged\\._u3P${n}ExtrasV1 && addU3P${n}Extras\\(merged\\.units\\)\\) merged\\._u3P${n}ExtrasV1 = true;`));
    assert.match(h.extraerFuncion('applyPageFixes'), new RegExp(`\\baddU3P${n}Extras\\b`));
  }
});

// ── Correcciones de la gramática regenerada (2 de octubre) ────────────────
const F = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'fixGrammarTopic', 'u3Lote', 'u3Regenerada',
  'fixU3P27', 'fixU3P29', 'fixU3P31', 'fixU3P32', 'fixU3P34', 'fixU3P35'];
const g = h.ejecutar(`${F.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${F.join(', ')} };`, {});
const P27 = 'b_1790971568380_jwaq57';
const IMPRESO_32 = `Then you can go to dance school and take a crash course so you can learn really fast.`;
const IMPRESO_27 = `Coral: Ben? He can play three instruments now: piano, guitar, and violin.`;

function regenerada(gv = 3) {
  const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
  return { a2_3: { fcProgress: { discuss: { interval: 58 } }, batches: [
    { id: P27, pages: [27], vocab: [w("How's Ben doing?", "He's doing great. He can play three instruments now.", { type: 'question' })] },
    { id: g.u3Lote(29), pages: [29], grammarVersion: gv, speakingPrompts: ['Role-play the conversation. Say why you need to find someone with a particular ability. Then change roles.',
      'Change partners. Role-play the conversation again.'] },
    { id: g.u3Lote(31), pages: [31], grammarVersion: gv, vocab: [w('discuss', "Let's discuss the homework with the teacher.", { translation: 'discutir, hablar sobre' })],
      speakingPrompts: ['Give more advice, using should or shouldn\'t.', 'Change partners. Role-play the conversation again. Discuss other ailments. Give other advice.'] },
    { id: g.u3Lote(32), pages: [32], grammarVersion: gv,
      grammar: [{ title: 'Make + person + adjective',
        examples: [{ en: "I don't want to make her sad and ruin our first date.", es: 'x' }, { en: 'Hot chicken soup makes Ruby happy.', es: 'y' }],
        drillSentences: [{ type: 'translation', prompt: 'El partido de mañana pone emocionado a Bruce.', answer: 'The game tomorrow makes Bruce excited.' }] }],
      exercises: [{ type: 'fill_blank', question: 'Bruce has one week before the date. He can go to dance school and take a crash __.', answer: 'course' }] },
    { id: g.u3Lote(34), pages: [34], grammarVersion: gv,
      vocab: [w('directions', 'Can you give me directions to the library?', { translation: 'instrucciones, direcciones', exampleTranslation: '¿Puedes darme direcciones a la biblioteca?' })],
      grammar: [{ title: "It's hard to + base verb" }, { title: 'Too + adjective + to + base verb', examples: [{ en: 'People can be too old to learn a language.' }] }],
      exercises: [{ question: 'Find and correct the mistake: She is too old for learn the piano.' }, { question: 'Look at the __ . A man tells his dog, "Roll over!"' }] },
    { id: g.u3Lote(35), pages: [35], vocab: [w('cooking', 'I practice cooking every day.', { exampleTranslation: 'Practico cocina cada día.' })] },
  ] } };
}
const pag = (units, n) => units.a2_3.batches.find(b => b.pages[0] === n);
const todas = units => { for (const n of [27, 29, 31, 32, 34, 35]) assert.equal(g[`fixU3P${n}`](units), true, `p. ${n}`); };

test('p. 32: la cita de Bruce es mañana, el partido es de Ruby, y la sopa no está en la lectura', () => {
  const units = regenerada(); todas(units);
  const p = pag(units, 32);
  assert.equal(p.exercises[0].question, 'Then you can go to dance school and take a crash __ so you can learn really fast.');
  assert.ok(IMPRESO_32.includes(p.exercises[0].question.replace('__', 'course')), 'la frase está impresa en la página');
  assert.deepEqual(p.grammar[0].examples.map(e => e.en), ["I don't want to make her sad and ruin our first date."]);
  assert.deepEqual([p.grammar[0].drillSentences[0].prompt, p.grammar[0].drillSentences[0].answer],
    ['El partido de mañana pone emocionada a Ruby.', 'The game tomorrow makes Ruby excited.']);
});

test('p. 34: fuera el tema que salía de una frase falsa del ejercicio de escucha', () => {
  const units = regenerada(); todas(units);
  const p = pag(units, 34);
  assert.deepEqual(p.grammar.map(x => x.title), ["It's hard to + base verb"]);
  assert.deepEqual(p.exercises.map(e => e.question), ['Look at the __ . A man tells his dog, "Roll over!"']);
  const d = p.vocab[0];
  assert.deepEqual([d.translation, d.exampleTranslation], ['instrucciones, indicaciones', '¿Me puedes indicar cómo llegar a la biblioteca?']);
});

test('pp. 29 y 31: la conversación una sola vez en el speaking; discuss es "hablar de"', () => {
  const units = regenerada(); todas(units);
  assert.equal(pag(units, 29).speakingPrompts.length, 1);
  assert.deepEqual(pag(units, 31).speakingPrompts, ["Give more advice, using should or shouldn't."]);
  assert.equal(pag(units, 31).vocab[0].translation, 'hablar de, conversar sobre');
  assert.deepEqual(units.a2_3.fcProgress.discuss, { interval: 58 }, 'el progreso no se toca');
});

test('p. 27 y p. 35: la respuesta de Coral, impresa; y "practico la cocina"', () => {
  const units = regenerada(); todas(units);
  const ben = pag(units, 27).vocab[0].example;
  assert.equal(ben, 'Ben? He can play three instruments now: piano, guitar, and violin.');
  assert.ok(IMPRESO_27.includes(ben));
  assert.equal(pag(units, 35).vocab[0].exampleTranslation, 'Practico la cocina todos los días.');
});

test('con la gramática de mayo en este aparato, la corrección no marca su bandera (se reintenta)', () => {
  const units = regenerada(2);
  for (const n of [29, 31, 32, 34]) assert.equal(g[`fixU3P${n}`](units), false, `p. ${n}`);
  assert.equal(pag(units, 31).vocab[0].translation, 'hablar de, conversar sobre', 'lo que no depende de la regeneración sí se corrige');
  for (const n of [27, 29, 31, 32, 34, 35]) assert.equal(g[`fixU3P${n}`]({}), false);
});

test('correrlas otra vez no cambia nada; el arranque y la restauración las corren', () => {
  const units = regenerada(); todas(units);
  const una = JSON.stringify(units); todas(units);
  assert.equal(JSON.stringify(units), una);
  const migrar = h.extraerFuncion('migrateState');
  for (const n of [27, 29, 31, 32, 34, 35]) {
    assert.match(migrar, new RegExp(`if \\(!merged\\._u3P${n}FixV1 && fixU3P${n}\\(merged\\.units\\)\\) merged\\._u3P${n}FixV1 = true;`));
    assert.match(h.extraerFuncion('applyPageFixes'), new RegExp(`\\bfixU3P${n}\\b`));
  }
});
