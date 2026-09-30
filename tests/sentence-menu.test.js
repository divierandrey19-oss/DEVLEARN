/**
 * Escuchar una sola frase del texto.
 *
 * El botón 🔄 de cada frase solo la volteaba al español. Para oír una frase
 * había que darle Listen y escuchar el texto entero. Ahora el botón abre un
 * menú: 🔊 Listen (solo esa frase) o 🔄 Flip.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

function montar({ playing = false } = {}) {
  const dichos = [];
  const resaltadas = [];
  let cancelados = 0;
  const _txState = { sentences: ['Let me think...', 'For me, the most appealing life goal is to make a ton of money.', 'Finally, the third goal is to have kids.'],
    current: -1, rate: 0.85, playing, flippedES: new Set() };
  const f = h.ejecutar(`
    ${h.extraerFuncion('listenSentence')}
    return { listenSentence };
  `, {
    _txState,
    closeSentenceMenu() {},
    highlightSentence: si => resaltadas.push(si),
    speak: (texto, rate) => dichos.push([texto, rate]),
    window: { speechSynthesis: { cancel: () => { cancelados++; } } },
    document: { getElementById: () => null },
  });
  return { ...f, _txState, dichos, resaltadas, cancelados: () => cancelados };
}

test('Listen lee solo esa frase, a la velocidad elegida', () => {
  const m = montar();
  m.listenSentence(1);
  assert.deepEqual(m.dichos, [['For me, the most appealing life goal is to make a ton of money.', 0.85]]);
  assert.deepEqual(m.resaltadas, [1], 'se resalta la frase que suena');
});

test('deja el cursor en esa frase, para que ◀ y 🔁 sigan desde ahí', () => {
  const m = montar();
  m.listenSentence(2);
  assert.equal(m._txState.current, 2);
});

test('si el texto entero estaba sonando, lo para antes de leer la frase', () => {
  const m = montar({ playing: true });
  m.listenSentence(0);
  assert.equal(m._txState.playing, false);
  assert.ok(m.cancelados() >= 1);
  assert.equal(m.dichos.length, 1);
});

test('el botón de cada frase abre el menú en vez de voltear de una', () => {
  const lector = h.extraerFuncion('renderTextReader');
  assert.doesNotMatch(lector, /class="tx-flip" onclick="flipSentence/);
  assert.equal(lector.split('onclick="sentenceMenu(${si}, this)"').length - 1, 2,
    'en la frase en inglés y en la volteada');
  const menu = h.extraerFuncion('sentenceMenu');
  assert.match(menu, /onclick="listenSentence\(\$\{si\}\)">🔊 Listen</);
  assert.match(menu, /flipSentence\(\$\{si\}\)/);
});
