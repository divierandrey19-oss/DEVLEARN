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

test('sin frase que copiar, el ejemplo es inglés natural aunque cambie la forma impresa', () => {
  // Unit 2, p. 14: con "solo palabras impresas" salió "I like a basketball
  // game", porque la página dice "a basketball game".
  assert.match(analisis, /You may change their form \(plural, verb ending\) to\s+make it natural/);
  assert.match(analisis, /"I like a basketball\s+game" is wrong/);
  assert.match(analisis, /write a short, natural \$\{levelName\} sentence built from words printed on these pages \(their form may change/);
  assert.doesNotMatch(analisis, /sentence using ONLY words printed on these pages/);
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

test('la explicación y la trampa de la gramática van en español', () => {
  // Con Opus, la p. 112 salió con ambas en inglés: el prompt nunca dijo el
  // idioma. Su regla es que el contenido de estudio va en español.
  assert.match(analisis, /"explanation": "Clear explanation IN SPANISH \(Colombian\)/);
  assert.match(analisis, /"spanishTrap": "IN SPANISH: one real mistake/);
  assert.match(analisis, /- LANGUAGE: the grammar "explanation" and "spanishTrap" are written in Spanish/);
});

test('las opciones de un ejercicio de selección no son hechos', () => {
  // En la p. 107 la IA tomó como ciertas las dos opciones de cada pregunta de
  // "Scan for facts", y en la p. 102 juntó dos opciones en una frase.
  assert.match(analisis, /━━ ANSWER OPTIONS ARE NOT FACTS ━━/);
  assert.match(analisis, /Never turn an option into a vocabulary example, a grammar example or a statement/);
  assert.match(analisis, /Never build a sentence by joining two options/);
});

// ── Unit 2, pp. 17-23 (respaldo del 2 de octubre) ─────────────────────────
// La IA ve una página a la vez: repitió "Would you like to" en tres páginas y,
// en la p. 23, once tarjetas del recuadro RECYCLE con espacios en blanco. En la
// p. 22 tomó como hechos las afirmaciones FALSAS de un ejercicio. Y el aviso
// "no role play scenes" salía en una página que no imprime speaking.

const analyzeWithAI = (() => {
  const a = fuente.indexOf('async function analyzeWithAI(');
  return fuente.slice(a, fuente.indexOf('\n}\n', a));
})();

const ayuda = h.ejecutar(`${['unitKnownContent', 'unitAlreadyTaughtSection', 'sanitizeGrammar', 'vocabKey', 'questionCard']
  .map(n => h.extraerFuncion(n)).join('\n')}
  return { unitKnownContent, unitAlreadyTaughtSection, sanitizeGrammar, vocabKey, questionCard };`, {});

/** _analyzeReal con una IA de mentira: guarda el prompt y responde `json`. */
async function analizarCon(json, known) {
  const fin2 = fuente.indexOf('  /* ── Main entry point', ini);
  const enviado = {};
  const svc = h.ejecutar(`
    ${['sanitizeGrammar', 'vocabKey', 'questionCard', 'unitAlreadyTaughtSection'].map(n => h.extraerFuncion(n)).join('\n')}
    return { async _callClaude(opts) { enviado.prompt = opts.messages[0].content.find(c => c.type === 'text').text;
                                       return ${JSON.stringify(JSON.stringify(json))}; },
    ${fuente.slice(fuente.lastIndexOf('\n', ini) + 1, fin2)} };`, { enviado });
  const r = await svc._analyzeReal({ images: ['data:image/jpeg;base64,AAAA'], level: 'a2', unitNum: 2, known });
  return { r, prompt: enviado.prompt };
}

test('lo que la unidad ya tiene en otras páginas, sin la página que se analiza', () => {
  const nueva = { id: 'n', vocab: [{ word: 'Same here!' }], grammar: [{ title: 'Nuevo' }] };
  const unidad = { batches: [
    { id: 'a', vocab: [{ word: "That's more my style." }, { word: 'between' }], grammar: [{ title: 'Would you like to' }] },
    { id: 'b', vocab: [{ word: 'between' }, null], grammar: [] },
    nueva,
  ] };
  assert.deepEqual(ayuda.unitKnownContent(unidad, nueva), { words: ["That's more my style.", 'between'], grammar: ['Would you like to'] });
  assert.equal(ayuda.unitAlreadyTaughtSection({ words: [], grammar: [] }), '', 'la primera página de la unidad no lleva la sección');
});

test('el análisis recibe esa lista y la pone en el prompt', async () => {
  const { prompt } = await analizarCon({ vocabulary: [] }, { words: ['How do I get to the museum?', 'between'], grammar: ['Prepositions of time: on, in, at'] });
  assert.match(prompt, /━━ ALREADY ON OTHER PAGES OF THIS UNIT ━━/);
  assert.match(prompt, /Cards: How do I get to the museum\? · between/);
  assert.match(prompt, /Grammar topics \(do not make another topic that teaches the same point\): Prepositions of time: on, in, at/);
  assert.match(prompt, /with blanks \("How do I get to ___\?" is "How do I get to the\s+museum\?"\)/);
  assert.match(prompt, /Never skip an item that appears there — unless another page of this unit already has\s+it as a card/);
  const { prompt: primera } = await analizarCon({ vocabulary: [] }, undefined);
  assert.doesNotMatch(primera, /ALREADY ON OTHER PAGES OF THIS UNIT ━━\n\nThe student/);
  assert.match(analyzeWithAI, /known: unitKnownContent\(unit, batch\),/);
});

test('las frases de un "corrige las afirmaciones falsas" no son hechos', () => {
  assert.match(analisis, /A task that asks the student to correct FALSE statements \("Correct each of these false\s+statements", LISTEN FOR ERRORS, true\/false\)/);
  assert.match(analisis, /None of them is a fact: never use\s+one as a vocabulary example, a grammar example, a statement or a question's answer/);
});

test('en un ejercicio de emparejar, la línea de al lado no es su pareja', () => {
  // Unit 1, p. 11: UNDERSTAND FROM CONTEXT imprime las definiciones en
  // desorden y salió "accent = the characteristic stress pattern of sentences".
  assert.match(analisis, /prints its two columns in MIXED order on purpose: a word and the line printed next to it\s+are NOT a pair\./);
  assert.match(analisis, /Pair them only where the page's own text \(the reading, the dialogue\)\s+shows the match/);
});

test('sin speaking no es "incompleta" si la respuesta llegó hasta el final', async () => {
  const completa = await analizarCon({ vocabulary: [], speakingPrompts: [], questions: [] });
  assert.equal(completa.r.complete, true);
  const cortada = await analizarCon({ vocabulary: [] });
  assert.equal(cortada.r.complete, false);
  assert.match(analyzeWithAI, /if \(!\(batch\.speakingPrompts \|\| \[\]\)\.length && !parsed\.complete\) faltan\.push\('no role play scenes'\);/);
});
