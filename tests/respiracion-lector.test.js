/**
 * Marca de respiración en el lector (botón 🫁).
 *
 * Dev memoriza los textos para hablar, y su punto flojo en los speaking tests
 * es la coherencia. Para grabar sus videos quería ver dónde tomar aire. El
 * botón pinta una "/" después de cada coma, punto y coma o dos puntos. Es solo
 * visual: se calcula de la puntuación al dibujar, no se guarda en el texto, así
 * que el Listen (que lee splitSentences(body)), el tocar una palabra y el Flip
 * siguen con el texto limpio.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

test('el botón recuerda la preferencia y re-dibuja', () => {
  const _txState = { breathing: false };
  const state = { txBreathing: false };
  const llamadas = { save: 0, render: 0 };
  const { toggleBreathing } = h.ejecutar(
    `${h.extraerFuncion('toggleBreathing')} return { toggleBreathing };`,
    { _txState, state, save: () => { llamadas.save++; }, renderTextReader: () => { llamadas.render++; }, Sound: { tap() {} } });

  toggleBreathing();
  assert.equal(_txState.breathing, true, 'lo enciende');
  assert.equal(state.txBreathing, true, 'lo recuerda para el próximo texto');
  assert.ok(llamadas.save >= 1 && llamadas.render >= 1, 'guarda y vuelve a dibujar');

  toggleBreathing();
  assert.equal(_txState.breathing, false, 'y lo apaga');
  assert.equal(state.txBreathing, false);
});

test('la marca sale solo con el toggle y solo tras coma / ; / :', () => {
  // La condición es st.breathing Y que el token termine en , ; o :
  assert.match(fuente, /if \(st\.breathing && \/\[,;:\]\$\/\.test\(tok\)\) out \+= ` <span class="tx-breath"/);
});

test('es solo visual: no se mete al texto que lee el audio', () => {
  // El Listen y el Flip trabajan sobre splitSentences(body) / frasesTraducidas,
  // sin marcas. Nunca se escribe la marca dentro de t.body.
  assert.match(fuente, /const sentences = splitSentences\(t\.body\);/);
  assert.doesNotMatch(fuente, /t\.body\s*=\s*[^;\n]*tx-breath/);
});

test('el lector arranca con la preferencia guardada', () => {
  assert.match(fuente, /breathing: !!state\.txBreathing,/);
});
