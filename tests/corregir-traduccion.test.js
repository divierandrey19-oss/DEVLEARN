/**
 * Corregir una traducción escrita (7 de noviembre).
 *
 * Él escribió "Repeating what you hear helps ypo" y la app le dijo
 * "✅ Correct!". El prompt solo pedía buscar errores de gramática y decía
 * explícitamente que ignorara el vocabulario, así que una frase cortada y con
 * una palabra que no existe pasaba. Una traducción está bien si dice lo mismo
 * Y está escrita en inglés de verdad.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const corregir = h.extraerFuncion('checkTranslation');

/** Corre checkTranslation con una IA de mentiras que devuelve `respuesta`. */
async function revisar(escrito, esperada, respuesta) {
  const input = { value: escrito, style: {}, focus() {}, select() {}, addEventListener() {} };
  const fb = { className: '', textContent: '', innerHTML: '', closest: () => null };
  const salida = {};
  let enviado = '';
  const { checkTranslation } = h.ejecutar(`${corregir} return { checkTranslation };`, {
    document: { getElementById: id => (id.startsWith('ex-input') ? input : id.startsWith('ex-fb') ? fb : null) },
    AIService: {
      mode: 'claude', getKey: () => 'k',
      _callClaude: async ({ messages }) => { enviado = messages[0].content; return respuesta; },
      _parseClaudeJSON: r => { try { return JSON.parse(r); } catch (e) { return null; } },
    },
    exerciseCorrect: () => { salida.veredicto = 'bien'; },
    exerciseWrong: (i, inp, f, ans, msg) => { salida.veredicto = 'mal'; salida.motivo = msg; },
    smartCheck: (u, e) => u === e,
  });
  await checkTranslation(0, esperada, 'una explicación');
  return { ...salida, enviado, fb };
}

const ESPERADA = 'Repeating what you hear helps your pronunciation';

test('una traducción cortada ya no pasa como correcta', async () => {
  // Lo que de verdad escribió. El guardia de largo no la atrapa: 6 palabras de
  // 7, y pide el 60%.
  const r = await revisar('Repeating what you hear helps ypo', ESPERADA,
    '{"has_error": true, "error": "\\"ypo\\" is not an English word and the sentence is cut off"}');
  assert.equal(r.veredicto, 'mal');
  assert.match(r.motivo, /ypo/);
});

test('una respuesta mala se marca mal una sola vez', async () => {
  // Sin el return seguía hasta el final y volvía a llamar a exerciseWrong: la
  // explicación de la IA quedaba pisada por "Expected: …" y el fallo se
  // contaba dos veces.
  const input = { value: 'Repeating what you hear helps ypo', style: {}, focus() {}, select() {}, addEventListener() {} };
  const fb = { className: '', textContent: '', innerHTML: '', closest: () => null };
  const marcas = [];
  const { checkTranslation } = h.ejecutar(`${corregir} return { checkTranslation };`, {
    document: { getElementById: id => (id.startsWith('ex-input') ? input : fb) },
    AIService: {
      mode: 'claude', getKey: () => 'k',
      _callClaude: async () => '{"has_error": true, "error": "the sentence is cut off"}',
      _parseClaudeJSON: r => JSON.parse(r),
    },
    exerciseCorrect: () => marcas.push('bien'),
    exerciseWrong: (i, inp, f, ans, msg) => marcas.push(msg),
    smartCheck: () => false,
  });
  await checkTranslation(0, ESPERADA, '');
  assert.deepEqual(marcas, ['the sentence is cut off'], 'una vez, y con lo que dijo la IA');
});

test('el prompt pide las dos cosas: que diga lo mismo y que esté bien escrito', async () => {
  const r = await revisar('Repeating what you hear helps your pronunciation', ESPERADA, '{"has_error": false, "error": null}');
  assert.equal(r.veredicto, 'bien');
  assert.match(r.enviado, /Model answer: "Repeating what you hear helps your pronunciation"/);
  assert.match(r.enviado, /no part of the meaning is missing/i);
  assert.match(r.enviado, /real, correctly spelled English word/i);
  assert.match(r.enviado, /not English or is misspelled/i);
  assert.doesNotMatch(r.enviado, /Ignore word choice differences/i, 'era justo lo que dejaba pasar "ypo"');
  assert.doesNotMatch(r.enviado, /Your ONLY job/i);
});

test('un sinónimo o un orden distinto siguen valiendo', async () => {
  const r = await revisar('Repeating what you listen to helps your pronunciation', ESPERADA, '{"has_error": false, "error": null}');
  assert.equal(r.veredicto, 'bien');
  assert.match(r.enviado, /A synonym that keeps the meaning/i);
  assert.match(r.enviado, /different but grammatically correct word order/i);
});

test('"no grammar mistake" dentro de la explicación ya no la da por buena', async () => {
  // El texto suelto mandaba sobre el JSON: con el prompt nuevo, una respuesta
  // como esta es la normal cuando la frase está incompleta pero bien armada.
  const r = await revisar('Repeating what you hear helps ypo', ESPERADA,
    '{"has_error": true, "error": "There is no grammar mistake, but the sentence is incomplete"}');
  assert.equal(r.veredicto, 'mal');
  assert.match(h.extraerFuncion('checkTranslation'), /const noErrorInText = !data && \(rawText\.includes\('no grammar mistake'\)/);
});

test('si la IA no responde con JSON, el texto suelto sigue sirviendo', async () => {
  const r = await revisar('Repeating what you hear helps your pronunciation', ESPERADA, 'There is no grammar mistake here.');
  assert.equal(r.veredicto, 'bien');
});

test('una respuesta demasiado corta se rechaza sin gastar tokens', async () => {
  const r = await revisar('Repeating what', ESPERADA, '{"has_error": false}');
  assert.equal(r.veredicto, undefined, 'ni correcta ni incorrecta: le pide escribir la frase completa');
  assert.equal(r.enviado, '', 'no llama a la IA');
  assert.match(r.fb.innerHTML, /Incomplete/);
});

test('si la IA falla, no se da por buena', async () => {
  const input = { value: 'algo largo que llena el mínimo de palabras aquí', style: {} };
  const fb = { className: '', textContent: '', innerHTML: '', style: {} };
  let veredicto;
  const { checkTranslation } = h.ejecutar(`${corregir} return { checkTranslation };`, {
    document: { getElementById: id => (id.startsWith('ex-input') ? input : fb) },
    AIService: { mode: 'claude', getKey: () => 'k', _callClaude: async () => { throw new Error('NETWORK'); }, _parseClaudeJSON: () => null },
    exerciseCorrect: () => { veredicto = 'bien'; }, exerciseWrong: () => { veredicto = 'mal'; }, smartCheck: () => true,
  });
  await checkTranslation(0, ESPERADA, '');
  assert.equal(veredicto, undefined);
  assert.match(fb.textContent, /Could not verify/);
});

// ── "¿De qué artículo me están hablando?" ──────────────────────────────────
// La p. 11 de la Unit 1 pregunta por un texto impreso en la página. Las fotos
// se quedan en el aparato donde las subió, así que en el computador no lo ve.

const { avisoDelLibro } = h.ejecutar(`
  ${h.extraerFuncion('avisoDelLibro')}
  return { avisoDelLibro };`, {
  bookPageLabel: b => (b && (b.pages || []).length ? `p. ${b.pages[0]}` : ''),
  escapeHtml: x => String(x),
});

const p11 = { pages: [11] };

test('los ejercicios que mandan a mirar el texto avisan qué página abrir', () => {
  const aviso = avisoDelLibro({ question: 'Which statement is FALSE according to the article?' }, p11);
  assert.match(aviso, /📖 This one is about the text on the page — open p\. 11 in your book\./);
  for (const q of [
    'According to the reading, which kind of music helps you sleep?',
    'According to the text, what colors do people wear?',
    "Which of these does the article say food carts sometimes DON'T have?",
    'Andrew wants to change the topic of the conversation. What does he say?',
    'Does Eddie want to go to a late-night show? What does he say?',
  ]) assert.notEqual(avisoDelLibro({ question: q }, p11), '', q);
});

test('no avisa donde no hay texto que mirar', () => {
  for (const q of [
    'Which article is INCORRECT?',                                   // el artículo gramatical
    'Find and correct the mistake: What is the email of your teacher?',
    "Complete the dialogue: 'I don't like eggs.' '___!'",
    'Thanks for the conversation! ___ now. I have to go home.',
    'Translate to English: Repetir lo que escuchas ayuda tu pronunciación.',
  ]) assert.equal(avisoDelLibro({ question: q }, p11), '', q);
});

test('sin número de página, el aviso igual sale', () => {
  assert.match(avisoDelLibro({ question: 'According to the article, what produces dopamine?' }, {}),
    /open the page in your book/);
});

test('el aviso va debajo de la pregunta, en los tres estados del ejercicio', () => {
  const render = h.extraerFuncion('renderExerciseItems');
  assert.match(render, /^function renderExerciseItems\(exercises, startIdx = 0, batch = null\) \{/);
  assert.equal(render.split('${avisoDelLibro(ex, batch)}').length - 1, 3, 'resuelto, de unir y por responder');
  assert.ok(!/<div class="exercise-q">\$\{ex\.question \|\| ''\}<\/div>(?!\$\{avisoDelLibro)/.test(render));
  // Cada grupo pasa su página; una unidad de una sola página, la suya.
  assert.match(fuente, /renderExerciseItems\(b\.exercises, globalIdx, b\);/);
  assert.match(fuente, /renderExerciseItems\(exercises, 0, \(unit && \(unit\.batches \|\| \[\]\)\.length === 1\) \? unit\.batches\[0\] : null\);/);
});
