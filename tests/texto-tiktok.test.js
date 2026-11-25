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
const t3 = semilla.find(x => x.id === 'txt_tiktok3');

const { splitSentences } = h.ejecutar(`${h.extraerFuncion('splitSentences')} return { splitSentences };`, {});

test('el guion de TikTok está en la semilla, con su traducción', () => {
  assert.ok(t, 'falta txt_tiktok2');
  assert.equal(t.title, 'TikTok · Video 2');
  assert.deepEqual(t.wh, [], 'sin preguntas WH: es un texto para leer, no para preguntar');
  assert.ok(t.trans && t.trans.length > 200, 'con la traducción al español');
});

test('es su texto tal cual, sin cambiarle una palabra', () => {
  // Frases exactas de lo que él mandó (video 2, versión corta de 6 bloques).
  // Si una se edita, la prueba lo atrapa.
  assert.match(t.body, /^I'm 21, and I still haven't gone to university\. And it's not because I don't want to\./);
  assert.match(t.body, /My English isn't perfect, but I'm practicing, and this video is part of that\./);
  assert.match(t.body, /I did two programs in accounting and finance/);
  assert.match(t.body, /you don't need to have it all figured out to start building/);
  assert.match(t.body, /preparing for the admission exam for the National University/);
  assert.match(t.body, /Follow me and let's learn together: English, business, and getting into university/);
  assert.match(t.body, /My journey is just starting\.$/);
});

test('cada frase tiene su traducción: el Flip to Spanish cuadra', () => {
  // Si no coinciden, el lector marca mismatch y el menú de la frase pierde
  // "Flip to Spanish".
  assert.equal(splitSentences(t.trans).length, splitSentences(t.body).length);
  assert.equal(splitSentences(t.body).length, 14, 'los dos puntos no parten frase (van con "understood:" y "together:")');
});

test('se entrega subiendo SEED_VERSION', () => {
  const m = fuente.match(/const SEED_VERSION = (\d+);/);
  assert.ok(m && Number(m[1]) >= 18, 'con 17, quien ya abrió la app nunca recibe el video 3');
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

test('el guion nuevo son 6 bloques, sin lo que él quitó', () => {
  assert.match(t.body, /Follow me and let's learn together: English, business, and getting into university\./);
  assert.doesNotMatch(t.body, /Hi, I'm Dev/, 'la versión corta quitó la presentación larga');
  assert.doesNotMatch(t.body, /how to improve your English/, 'ya no está el bloque 6 anterior');
  assert.equal(t.body.split(/\n\n/).length, 6, 'seis bloques');
  assert.equal(t.trans.split(/\n\n/).length, 6, 'la traducción, también seis');
});

test('la migración del bloque 6 (v1→v2) sigue, sin pisar lo que él edite', () => {
  // Sigue viva para un aparato que aún esté en v1: lo lleva a v2 antes de que
  // corra la V4. Solo reemplaza si sigue siendo la versión vieja exacta.
  assert.match(fuente, /if \(!merged\._tiktok2B6V2\) \{/);
  assert.match(fuente, /if \(t\.body && t\.body\.includes\(viejoEN\)\) t\.body = t\.body\.replace\(viejoEN, nuevoEN\);/);
  assert.match(fuente, /merged\._tiktok2B6V2 = true;/);
});

test('la migración V4 reemplaza todo el texto, solo si sigue siendo la v2 exacta', () => {
  // Reemplaza body y trans juntos, y solo si AMBOS son la v2 exacta: si él
  // editó cualquier parte, no se toca. La bandera se marca solo si el texto está.
  assert.match(fuente, /if \(!merged\._tiktok2V4\) \{/);
  assert.match(fuente, /if \(t\.body === v2EN && t\.trans === v2ES\) \{ t\.body = v4EN; t\.trans = v4ES; \}/);
  assert.match(fuente, /merged\._tiktok2V4 = true;/);
});

// ── Video 3: el viaje a Cartagena (para el primer speaking del B1) ──────────

test('el video 3 está en la semilla, tal cual, con su traducción', () => {
  assert.ok(t3, 'falta txt_tiktok3');
  assert.equal(t3.title, 'TikTok · Video 3');
  assert.deepEqual(t3.wh, []);
  // Frases exactas de lo que él mandó.
  assert.match(t3.body, /^Last month, I was in Cartagena… swimming with fish! Oh my God, it was amazing\./);
  assert.match(t3.body, /We went to San Felipe Castle to do a photo shoot for her birthday/);
  assert.match(t3.body, /In Barú, I went snorkeling\./);
  assert.match(t3.body, /But the best part\? Spending time with my family\./);
  assert.match(t3.body, /Have you ever been to Cartagena\? If you haven't, you have to go!$/);
});

test('el video 3: cada frase con su traducción (Flip cuadra) y 9 bloques', () => {
  assert.equal(splitSentences(t3.trans).length, splitSentences(t3.body).length);
  assert.equal(splitSentences(t3.body).length, 24, 'los "…" y los ¿¡ no descuadran el conteo');
  assert.equal(t3.body.split(/\n\n/).length, 9);
  assert.equal(t3.trans.split(/\n\n/).length, 9);
});

test('el video 3 no entra al repaso por unidad', () => {
  const { textInReview } = h.ejecutar(
    `let _unidadesTextoEnRepaso = [1,2,3,4,5,6,7,8,9,10];
     ${h.extraerFuncion('textInReview')} return { textInReview };`, {});
  assert.equal(textInReview(t3), false);
});

test('el video 3: el bloque 3 quedó con la Torre del Reloj como entrada', () => {
  assert.match(t3.body, /And this is the Clock Tower, the main entrance to the Walled City\. I love this picture\./);
  assert.doesNotMatch(t3.body, /my mom, my brother, my sister, my niece/, 'ya no está la lista de la familia');
});

test('la migración V2 del video 3 cambia solo el bloque 3, sin pisar lo que él edite', () => {
  // Reemplazo por includes de la versión anterior exacta; bandera solo si el
  // texto está en el aparato.
  assert.match(fuente, /if \(!merged\._tiktok3V2\) \{/);
  assert.match(fuente, /if \(t\.body && t\.body\.includes\(b3EN\)\) t\.body = t\.body\.replace\(b3EN, b3EN2\);/);
  assert.match(fuente, /if \(t\.trans && t\.trans\.includes\(b3ES\)\) t\.trans = t\.trans\.replace\(b3ES, b3ES2\);/);
  assert.match(fuente, /merged\._tiktok3V2 = true;/);
});
