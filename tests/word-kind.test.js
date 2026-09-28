/**
 * La etiqueta de la tarjeta: verbo, sustantivo, phrasal verb…
 *
 * Él pidió ver en cada flashcard qué clase de palabra es, para saber cómo
 * usarla. El tipo lo pone la IA al analizar la página, pero a un phrasal verb
 * a veces lo marca como "verb" o "phrase": ese es el caso que más importa que
 * salga bien, porque es justo lo que él quiere distinguir.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const inicio = h.fuente().indexOf('const PHRASAL_PARTICLES = ');
const fin = h.fuente().indexOf(';\n', inicio);
const { wordKind, wordKindBadge } = h.ejecutar(`
  ${h.fuente().slice(inicio, fin + 1)}
  ${h.extraerFuncion('wordKind')}
  ${h.extraerFuncion('wordKindBadge')}
  return { wordKind, wordKindBadge };
`, {});

const tipo = (word, type) => (wordKind({ word, type }) || {}).label || null;

test('los tipos que manda la IA tienen su etiqueta', () => {
  assert.equal(tipo('run', 'verb'), 'Verb');
  assert.equal(tipo('helmet', 'noun'), 'Noun');
  assert.equal(tipo('scary', 'adj'), 'Adjective');
  assert.equal(tipo('scary', 'adjective'), 'Adjective');
  assert.equal(tipo('quickly', 'adv'), 'Adverb');
  assert.equal(tipo('to tell you the truth', 'phrase'), 'Expression');
  assert.equal(tipo('Listen and repeat', 'instruction'), 'Expression');
});

test('un phrasal verb sale como phrasal verb aunque la IA diga verb o phrase', () => {
  assert.equal(tipo('give up', 'verb'), 'Phrasal verb');
  assert.equal(tipo('pick up', 'phrase'), 'Phrasal verb');
  assert.equal(tipo('take out the trash', 'verb'), 'Phrasal verb');
  assert.equal(tipo('work out', 'phrasal verb'), 'Phrasal verb', 'los sembrados ya dicen "phrasal verb"');
});

test('no confunde con phrasal verb lo que no lo es', () => {
  assert.equal(tipo('rock climbing', 'noun'), 'Noun', 'un sustantivo de dos palabras sigue siendo sustantivo');
  assert.equal(tipo('go to bed', 'verb'), 'Verb', '"to" no es partícula');
  assert.equal(tipo('a lot of', 'phrase'), 'Expression');
});

test('sin tipo conocido no hay etiqueta, en vez de una equivocada', () => {
  assert.equal(wordKind({ word: 'hi' }), null);
  assert.equal(wordKind({ word: 'hi', type: 'rarísimo' }), null);
  assert.equal(wordKindBadge({ word: 'hi' }), '');
});

test('la etiqueta sale en el frente y en el reverso de la tarjeta', () => {
  const tarjeta = h.extraerFuncion('renderFcStage');
  const veces = tarjeta.split('${wordKindBadge(v)}').length - 1;
  assert.ok(veces >= 4, `esperaba la etiqueta en Classic (frente y reverso), Quiz y Write; salió ${veces} veces`);
});
