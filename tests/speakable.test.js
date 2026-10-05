/**
 * Lo que la voz lee: speakableText() limpia el texto antes de hablar.
 *
 * Borraba todas las comillas simples, y con ellas el apóstrofo de las
 * contracciones: "we're" sonaba "were", "I'll" sonaba "ill" y "I've" sonaba
 * "Ive". Salió al meter las frases de un podcast ("I've been waiting…").
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { speakableText } = h.ejecutar(`
  ${h.extraerFuncion('speakableText')}
  return { speakableText };
`, {});

test('las contracciones conservan su apóstrofo', () => {
  assert.equal(speakableText("I've been waiting for this all day."), "I've been waiting for this all day.");
  assert.equal(speakableText("We're late, I'll call you."), "We're late, I'll call you.");
  assert.equal(speakableText("It's fine, don't worry."), "It's fine, don't worry.");
});

test('las comillas alrededor de una palabra se siguen quitando', () => {
  assert.equal(speakableText("She said 'hello' to me."), 'She said hello to me.');
  assert.equal(speakableText('"I goed" → "I went"'), 'I goed, I went', 'las correcciones del tutor');
});

// ── "live": vivir (/lɪv/) o en vivo (/laɪv/) — 5 de octubre ────────────────
// Sola, la voz decía "láiv"; en la frase, "liv". Él lo notó al tocar la
// palabra en el texto y compararla con WordReference.

const { comoSuenaEnLaFrase } = h.ejecutar(`
  ${h.extraerFuncion('comoSuenaEnLaFrase')}
  return { comoSuenaEnLaFrase };
`, {});

test('"live" sola se dice como el verbo', () => {
  assert.equal(speakableText('live'), 'liv');
  assert.equal(speakableText('Live.'), 'liv.');
  assert.equal(speakableText('live music'), 'live music', 'con su compañera, la voz acierta sola');
  assert.equal(speakableText('Where do your in-laws live?'), 'Where do your in-laws live?', 'en la frase no se toca');
});

test('en el lector, las palabras de al lado deciden', () => {
  // Sus textos: el verbo.
  assert.equal(comoSuenaEnLaFrase('live', ['animals', 'that'], 'on'), 'liv');
  assert.equal(comoSuenaEnLaFrase('live', ['goal', 'is', 'to'], 'a'), 'liv');
  // En vivo: con la palabra que acompaña, o después de ver / oír.
  assert.equal(comoSuenaEnLaFrase('live', ['some'], 'music'), 'live music');
  assert.equal(comoSuenaEnLaFrase('live', ['to', 'see', 'Pantera'], ''), 'see pantera live');
  // "lives": la tercera persona del verbo o el plural de "life".
  assert.equal(comoSuenaEnLaFrase('lives', ['she'], 'in'), 'livs');
  assert.equal(comoSuenaEnLaFrase('lives', ['in', 'their'], ''), 'lives');
  assert.equal(comoSuenaEnLaFrase('house', ['my'], ''), 'house', 'las demás, igual');
});

test('el lector dice lo que decidió, en el toque y en el 🔊', () => {
  const buscar = h.extraerFuncion('lookupWord');
  assert.match(buscar, /const decir = palabraParaDecir\(el, word\);/);
  assert.doesNotMatch(buscar, /speak\(word\)/);
  assert.match(buscar, /data-say="\$\{escapeStr\(decir\)\}"/);
});
