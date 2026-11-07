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
