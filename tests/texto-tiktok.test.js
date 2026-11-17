/**
 * El guion de TikTok (video 2), que Dev quiere practicar en el lector para la
 * pronunciación. Es su texto, tal cual lo escribió: no se le cambia una palabra.
 *
 * Se entrega como los demás textos suyos: subiendo SEED_VERSION, y solo llega a
 * un aparato suyo (aparatoSuyo). El título es "TikTok · Video 2" a propósito —
 * no empieza por "U<n>", así que no entra al repaso por unidad (textInReview).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const ini = fuente.indexOf('    const seed = [');
const fin = fuente.indexOf('\n    ];\n', ini);
const semilla = h.ejecutar(`return ${fuente.slice(ini + '    const seed = '.length, fin + 6)};`, {});
const t = semilla.find(x => x.id === 'txt_tiktok2');

const { splitSentences } = h.ejecutar(`${h.extraerFuncion('splitSentences')} return { splitSentences };`, {});

test('el guion de TikTok está en la semilla, con su traducción', () => {
  assert.ok(t, 'falta txt_tiktok2');
  assert.equal(t.title, 'TikTok · Video 2');
  assert.deepEqual(t.wh, [], 'sin preguntas WH: es un texto para leer, no para preguntar');
  assert.ok(t.trans && t.trans.length > 200, 'con la traducción al español');
});

test('es su texto tal cual, sin cambiarle una palabra', () => {
  // Frases exactas de lo que él mandó. Si una se edita, la prueba lo atrapa.
  assert.match(t.body, /^I'm 21, and I still haven't gone to university\. And it's not because I don't want to\./);
  assert.match(t.body, /I did two technical programs in accounting and finance/);
  assert.match(t.body, /you don't need to have it all figured out to start building/);
  assert.match(t.body, /preparing for the admission exam at the National University of Colombia/);
  assert.match(t.body, /My journey is just starting\.$/);
});

test('cada frase tiene su traducción: el Flip to Spanish cuadra', () => {
  // Si no coinciden, el lector marca mismatch y el menú de la frase pierde
  // "Flip to Spanish".
  assert.equal(splitSentences(t.trans).length, splitSentences(t.body).length);
  assert.equal(splitSentences(t.body).length, 17, 'los dos puntos no parten frase (van con "understood:" y "learn:")');
});

test('se entrega subiendo SEED_VERSION', () => {
  const m = fuente.match(/const SEED_VERSION = (\d+);/);
  assert.ok(m && Number(m[1]) >= 17, 'con 16, quien ya abrió la app nunca recibe el guion');
});

test('el título no entra al repaso por unidad', () => {
  // textInReview solo mete al repaso los títulos "U<n> · …". "TikTok · Video 2"
  // no empieza así, así que se queda fuera del repaso de textos de la unidad.
  const { textInReview } = h.ejecutar(
    `let _unidadesTextoEnRepaso = [1,2,3,4,5,6,7,8,9,10];
     ${h.extraerFuncion('textInReview')} return { textInReview };`, {});
  assert.equal(textInReview(t), false);
  // Y un texto de unidad sí entra, para no romper esa parte sin querer.
  assert.equal(textInReview({ title: 'U9 · pág 97' }), true);
});
