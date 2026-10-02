/**
 * La Unit 1: lo que le faltaba (él lo pidió el 2 de octubre, después de la
 * revisión). Se subió en julio, antes de que el análisis hiciera preguntas,
 * así que tenía 0; y el análisis de entonces no sacó expresiones impresas que
 * sirven para el speaking ("I'd like you to meet...", "for short", los
 * tratamientos Mr. / Mrs. / Ms. / Miss).
 *
 * Los ejemplos de las palabras nuevas se copian de la página, palabra por
 * palabra; la prueba lo comprueba contra lo que se ve en cada foto.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 11 }, (_, i) => i + 1);
const NOMBRES = ['vocabKey', 'questionCard', 'addQuestionCards', 'u1Lote', 'addPageExtras', 'addU1Extras', ...PAGINAS.map(n => `addU1P${n}Extras`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

// Lo que se ve en las fotos, de donde salen los ejemplos nuevos.
const IMPRESO = {
  3: `Marty: We are. By the way, I'm Marty Teller. And this is my wife, Ana . . . and our daughter, Catherine.
      Marty: It's a pleasure to meet you, too. But please call me Marty.`,
  4: `How's the weather today? (It's hot and sunny.)`,
  5: `A: Lisa, I'd like you to meet Mark. Mark, Lisa. 2 A: Who's that woman over there? A: I'm not sure. Let's talk later.`,
  6: `Titles For men: Mr. = married or single For women: Ms. = married or single Mrs. = married Miss = single`,
  7: `A: OK, Spence. It's great to meet you. I'm Joseph. Joe for short. B: Good to meet you, too. So, Joe, is Boston your hometown?`,
  9: `If so, why do they need English? Do you work in your own country?`,
  10: `Intonation can also make it clear in conversation that you are responding with true interest, as in these examples:
      Really? or No kidding! I actually don't want to lose my accent completely. It's a part of who I am.`,
  11: `B DISCUSSION | Discuss how you practice English outside of class.`,
};
// "Who's" llena el espacio de "___ that woman over there?" (p. 5, ejercicio E).
const plano = s => s.replace(/[()]/g, '').replace(/\s+/g, ' ');

function unidad() {
  return { a2_1: { fcProgress: {}, batches: PAGINAS.map(n => ({ id: f.u1Lote(n), pages: [n], vocab: [
    // Ya en la unidad: no se repiten.
    ...(n === 3 ? [{ word: 'Nationality', translation: 'Nacionalidad', example: 'Nationality: South Korean' }] : []),
    ...(n === 7 ? [{ word: 'title', translation: 'tratamiento', example: "Is Janet's title Mrs.?" }] : []),
  ] })) } };
}
const nuevas = (units, n, tipo) => units.a2_1.batches[n - 1].vocab.filter(v => (v.type === 'question') === (tipo === 'q') && v.translation !== 'Nacionalidad' && v.word !== 'title');

function conTodo() {
  const units = unidad();
  for (const n of PAGINAS) assert.equal(f[`addU1P${n}Extras`](units), true, `p. ${n}`);
  return units;
}

test('cada página recibe sus preguntas, en las flashcards', () => {
  const units = conTodo();
  for (const n of PAGINAS) {
    const q = nuevas(units, n, 'q');
    assert.ok(q.length >= 3, `p. ${n}: ${q.length} preguntas`);
    for (const c of q) {
      assert.match(c.word, /\?$/, c.word);
      assert.ok(c.translation && c.example, `${c.word}: falta la traducción o la respuesta`);
    }
  }
  const total = units.a2_1.batches.flatMap(b => b.vocab).filter(v => v.type === 'question').length;
  assert.equal(total, 49);
});

test('las palabras impresas que faltaban entran con el ejemplo copiado de la página', () => {
  const units = conTodo();
  const esperadas = { 3: ['This is...', 'Please call me...'], 4: ['weather'], 5: ["I'd like you to meet...", 'over there', "Let's talk later."],
    6: ['Mr.', 'Mrs.', 'Ms.', 'Miss'], 7: ['for short', 'Good to meet you, too.'], 9: ['If so', 'own'],
    10: ['No kidding!', 'a part of who I am'], 11: ['outside of class'] };
  for (const n of PAGINAS) {
    const p = nuevas(units, n, 'w');
    assert.deepEqual(p.map(v => v.word), esperadas[n] || [], `p. ${n}`);
    for (const v of p) {
      assert.ok(plano(IMPRESO[n]).includes(plano(v.example)), `p. ${n}: "${v.example}" no está impreso así`);
      assert.ok(v.translation && v.exampleTranslation && v.phonetic, v.word);
    }
  }
});

test('lo que la unidad ya tiene no se repite, y correrlo otra vez no cambia nada', () => {
  const units = conTodo();
  const claves = units.a2_1.batches.flatMap(b => b.vocab.map(v => f.vocabKey(v.word)));
  assert.equal(new Set(claves).size, claves.length);
  const una = JSON.stringify(units);
  for (const n of PAGINAS) f[`addU1P${n}Extras`](units);
  assert.equal(JSON.stringify(units), una);
  // Si él ya agregó una de estas en otra página, tampoco entra.
  const otra = unidad();
  otra.a2_1.batches[0].vocab.push({ word: 'over there', translation: 'allá' });
  f.addU1P5Extras(otra);
  assert.ok(!nuevas(otra, 5, 'w').some(v => v.word === 'over there'));
});

test('sin la página, nada (y no marca la bandera)', () => {
  for (const n of PAGINAS) {
    assert.equal(f[`addU1P${n}Extras`]({ a2_1: { batches: [] } }), false);
    assert.equal(f[`addU1P${n}Extras`]({}), false);
  }
});

test('las respuestas de las preguntas impresas son las del libro', () => {
  const units = conTodo();
  const r = (n, q) => nuevas(units, n, 'q').find(c => c.word === q).example;
  assert.equal(r(1, 'Why are you studying English?'), 'I want to meet people from a lot of countries. I need English for that!');
  assert.equal(r(3, "What's your present English language level?"), "I'm high-beginner level.");
  assert.equal(r(6, "What's your hometown?"), "I live in Toronto. That's my hometown now.");
  assert.equal(r(7, 'Is Boston your hometown?'), "No, it isn't. I'm originally from Miami.");
  assert.equal(r(11, 'How do you practice English outside of class?'), 'I watch TV in English, and I repeat what I hear.');
  assert.match(r(5, 'And what do you do?'), /I have a pet shop with my brother\./, 'su vida real, a propósito');
});

test('el arranque y la restauración de páginas las corren, después de las correcciones', () => {
  const migrar = h.extraerFuncion('migrateState');
  const restaurar = h.extraerFuncion('applyPageFixes');
  for (const n of PAGINAS) {
    assert.match(migrar, new RegExp(`if \\(!merged\\._u1P${n}ExtrasV1 && addU1P${n}Extras\\(merged\\.units\\)\\) merged\\._u1P${n}ExtrasV1 = true;`));
    assert.match(restaurar, new RegExp(`\\baddU1P${n}Extras\\b`));
  }
  // Primero se unen las repetidas y se renombran; después entra lo nuevo.
  assert.ok(migrar.indexOf('fixU1P11(') < migrar.indexOf('addU1P1Extras('));
  assert.ok(restaurar.indexOf('fixU1P11,') < restaurar.indexOf('addU1P1Extras,'));
});
