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

// Lo que salió mal en la página 110 (su respaldo del 29 de septiembre): un
// ejemplo que decía lo contrario del libro ("you can't just keep doing" →
// "you just have to keep doing"), "offense" sin "No", "keep your ideas" sin
// "to yourself", "work hard" como phrasal verb y "succeeding" sin forma base.

test('los ejemplos del libro se copian palabra por palabra, sin cambiar un "not"', () => {
  assert.match(analisis, /━━ EXAMPLES ARE COPIED, NEVER REWRITTEN ━━/);
  assert.match(analisis, /never drop or add "not", "can't", "don't", "never", "no"/);
  assert.match(analisis, /copy that sentence WORD FOR WORD/);
});

test('las expresiones van completas, con su conector y hasta la última palabra', () => {
  const s = analysisSeccion();
  assert.match(s, /"No offense, but…", never just "offense"/);
  assert.match(s, /"keep your ideas to yourself" \(guardarte tus ideas\), never "keep your\s+ideas"/);
});

test('verbo + adverbio no es phrasal verb, y los verbos van en forma base', () => {
  const s = analysisSeccion();
  assert.match(s, /A verb plus an\s+ordinary adverb or adjective is NOT a phrasal verb: "work hard"/);
  assert.match(s, /printed\s+"succeeding" is the word "succeed"/);
});

test('los ejemplos de la regla no se cuelan como vocabulario', () => {
  // "to tell you the truth" salió en la p. 110 sin estar impreso: estaba en
  // la lista de ejemplos de esta misma regla.
  assert.match(analysisSeccion(), /if you\s+cannot point to where it is printed on these photos, remove it/);
});

function analysisSeccion() {
  const a = analisis.indexOf('━━ PHRASAL VERBS AND FIXED EXPRESSIONS');
  return analisis.slice(a, analisis.indexOf('━━ THE PAGE MARKS', a));
}

// Lo que salió mal en la gramática y los ejercicios de las pp. 109-111 y venía
// del prompt mismo: pedía siempre una diferencia con el español (se inventó que
// "si" lleva subjuntivo), pedía "una segunda frase" sin decir cuál (salió "She
// told me yesterday…"), no limitaba la gramática "derived" (tres temas extra
// en una página de expresiones) y no impedía contradecir el libro.

test('la trampa del español solo si es real; si no, vacía', () => {
  assert.match(analisis, /If there is no real trap, return an empty string: that is a correct answer\./);
  assert.match(analisis, /Never invent a difference to have one\./);
  assert.doesNotMatch(analisis, /Grammar explanations must address Spanish interference explicitly/);
});

test('la frase de contexto sigue la misma situación', () => {
  assert.match(analisis, /The added sentence must continue the SAME situation, with the same people, and point to the answer\./);
  assert.match(analisis, /it must continue the same situation and point to the answer\."/);
});

test('como mucho dos temas "derived" si la página no enseña gramática', () => {
  assert.match(analisis, /return AT MOST TWO derived\s+points/);
});

test('nada de lo que la IA escribe puede decir lo contrario del libro', () => {
  assert.match(analisis, /6\. NEVER CONTRADICT THE PAGE\./);
  assert.match(analisis, /Plant the error in a sentence whose corrected meaning agrees with\s+the page\./);
  // Solo lo que reutiliza del libro: sus propias frases pueden opinar distinto.
  assert.match(analisis, /When you reuse a sentence from the page/);
  assert.match(analisis, /an\s+opinion that differs from one printed there is fine/);
});
