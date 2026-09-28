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
