/**
 * Lo que la app le pide a la IA al leer una página del libro.
 *
 * Él preguntó si la IA busca phrasal verbs. Los sacaba si estaban impresos y
 * marcados, pero nada le pedía buscarlos ni guardarlos enteros. Ahora el
 * análisis tiene una regla propia para phrasal verbs y expresiones fijas, y
 * "phrasal verb" es un tipo que la IA puede devolver.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const ini = fuente.indexOf('async _analyzeReal(');
const fin = fuente.indexOf('_parseClaudeJSON(raw) {', ini);
const analisis = fuente.slice(ini, fin);

test('el análisis pide buscar phrasal verbs y expresiones y guardarlos enteros', () => {
  assert.ok(ini > 0 && fin > ini, 'no se encontró _analyzeReal');
  assert.match(analisis, /━━ PHRASAL VERBS AND FIXED EXPRESSIONS: KEEP THEM WHOLE ━━/);
  assert.match(analisis, /Extract it as ONE\s+item, exactly as printed \("work out", never just "work"\), with "type": "phrasal verb"/);
});

test('la regla de phrasal verbs no se salta la de solo lo impreso', () => {
  assert.match(analysisSeccion(), /only phrasal verbs and expressions that are\s+printed on these pages/);
});

test('"phrasal verb" es un tipo válido en todo lo que clasifica palabras', () => {
  assert.match(analisis, /"type": "noun\|verb\|phrasal verb\|adj\|adv\|phrase\|pronoun\|instruction"/);
  const otros = fuente.split('"type":"noun|verb|phrasal verb|adjective|phrase"').length - 1;
  assert.equal(otros, 2, 'completar palabras y "My words" también');
});

function analysisSeccion() {
  const a = analisis.indexOf('━━ PHRASAL VERBS AND FIXED EXPRESSIONS');
  return analisis.slice(a, analisis.indexOf('━━ THE PAGE MARKS', a));
}
