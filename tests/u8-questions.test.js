/**
 * Las preguntas de la Unit 8 en las flashcards (él las pidió el 2 de octubre).
 * Se subió antes de que el análisis hiciera preguntas: tenía 0. Primero las que
 * el libro imprime, con la respuesta del libro; donde la respuesta es de su
 * vida, sale de sus textos de My life, que ya se sabe.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 11 }, (_, i) => 85 + i);
const NOMBRES = ['vocabKey', 'questionCard', 'addQuestionCards', 'addPageExtras', 'u8Lote', ...PAGINAS.map(n => `addU8P${n}Questions`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const unidad = () => ({ a2_8: { fcProgress: {}, batches: [
  ...PAGINAS.map(n => ({ id: f.u8Lote(n), pages: [n], vocab: [] })),
  { id: 'pv_a2_8', vocab: [{ word: "I'll take it", translation: 'me lo llevo' }] },
] } });
const preguntas = (units, n) => units.a2_8.batches.find(b => b.pages && b.pages[0] === n).vocab.filter(v => v.type === 'question');

test('cada página recibe sus preguntas, en las flashcards', () => {
  const units = unidad();
  for (const n of PAGINAS) assert.equal(f[`addU8P${n}Questions`](units), true, `p. ${n}`);
  for (const n of PAGINAS) {
    const q = preguntas(units, n);
    assert.ok(q.length >= 3, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  assert.equal(units.a2_8.batches.flatMap(b => b.vocab).filter(v => v.type === 'question').length, 40);
});

test('las respuestas de las preguntas impresas son las del libro', () => {
  const units = unidad();
  for (const n of PAGINAS) f[`addU8P${n}Questions`](units);
  const r = q => units.a2_8.batches.flatMap(b => b.vocab).find(v => v.word === q).example;
  assert.equal(r('Where do you usually buy your clothes?'), "Me? I usually buy my clothes online. They're too expensive at the mall!");
  assert.equal(r('So are those any better?'), "Much better. I'll take them.");
  assert.equal(r('How would you like to pay: cash or credit?'), 'Credit, please. Thanks for your help!');
  assert.equal(r("Where's the best place in town to buy footwear?"), 'That depends. What are you looking for?');
  assert.equal(r('Should I take the stairs?'), "No. It's on the third floor. Take the escalator.");
  assert.match(r("Where's the best place in your city to buy clothes?"), /the small shops near my house have the lowest prices/,
    'la de su vida, como en su texto de My life');
});

test('no repite lo que la unidad ya tiene, y correrlo otra vez no cambia nada', () => {
  const units = unidad();
  units.a2_8.batches[0].vocab.push({ word: 'What do you like to wear at home?', translation: 'x', type: 'question' });
  for (const n of PAGINAS) f[`addU8P${n}Questions`](units);
  assert.equal(preguntas(units, 86).length, 3, 'la de la p. 86 ya estaba en la p. 85');
  const claves = units.a2_8.batches.flatMap(b => b.vocab.map(v => f.vocabKey(v.word)));
  assert.equal(new Set(claves).size, claves.length);
  const una = JSON.stringify(units);
  for (const n of PAGINAS) f[`addU8P${n}Questions`](units);
  assert.equal(JSON.stringify(units), una);
});

test('sin la página, nada; el arranque y la restauración las corren', () => {
  for (const n of PAGINAS) assert.equal(f[`addU8P${n}Questions`]({ a2_8: { batches: [] } }), false);
  const migrar = h.extraerFuncion('migrateState');
  for (const n of PAGINAS) {
    assert.match(migrar, new RegExp(`if \\(!merged\\._u8P${n}QV1 && addU8P${n}Questions\\(merged\\.units\\)\\) merged\\._u8P${n}QV1 = true;`));
    assert.match(h.extraerFuncion('applyPageFixes'), new RegExp(`\\baddU8P${n}Questions\\b`));
  }
});
