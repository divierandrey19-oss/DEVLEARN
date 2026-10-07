/**
 * Los textos de la Unit 10, que él memoriza para hablar en clase.
 *
 * Se escriben de a poco, solo los de las páginas de la clase siguiente, a
 * partir de sus respuestas: su vida real, no una inventada. Pidió máximo 150
 * palabras; el 1 de octubre lo subió a 170. Y se entregan subiendo
 * SEED_VERSION: sin eso, quien ya abrió una versión anterior nunca los
 * recibe (pasó dos veces, ver CLAUDE.md).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const ini = fuente.indexOf('    const seed = [');
const fin = fuente.indexOf('\n    ];\n', ini);
const semilla = h.ejecutar(`return ${fuente.slice(ini + '    const seed = '.length, fin + 6)};`, {});
const texto = id => semilla.find(t => t.id === id);
const palabras = s => s.trim().split(/\s+/).length;

test('los textos de la Unit 10 están en la semilla, con traducción', () => {
  for (const [id, titulo] of [['txt_u10_p109', 'U10 · pág 109'], ['txt_u10_p110111', 'U10 · pág 110 - 111'], ['txt_u10_p112113', 'U10 · pág 112 - 113'], ['txt_u10_p114115', 'U10 · pág 114 - 115'], ['txt_u10_p116117', 'U10 · pág 116 - 117']]) {
    const t = texto(id);
    assert.ok(t, `falta ${id}`);
    assert.equal(t.title, titulo, 'el título agrupa por unidad ("U10 · …")');
    assert.ok(t.trans && t.trans.length > 200, 'con su traducción al español');
  }
});

test('máximo 170 palabras, como él pidió', () => {
  for (const id of ['txt_u10_p109', 'txt_u10_p110111', 'txt_u10_p112113', 'txt_u10_p114115', 'txt_u10_p116117']) {
    assert.ok(palabras(texto(id).body) <= 170, `${id} tiene ${palabras(texto(id).body)} palabras`);
  }
});

test('dicen lo que él contó de su vida, no lo que se supuso', () => {
  const p109 = texto('txt_u10_p109').body;
  assert.match(p109, /help animals that live on the street/);
  assert.match(p109, /the third goal is to have kids, but I don't know yet/);
  const p110 = texto('txt_u10_p110111').body;
  // "Nunca nos quedamos hasta tarde": se quitó del borrador.
  assert.doesNotMatch(p110, /stay late/);
  assert.match(p110, /Then we grab a bite together\./);
});

test('se entregan subiendo SEED_VERSION', () => {
  const m = fuente.match(/const SEED_VERSION = (\d+);/);
  assert.ok(m && Number(m[1]) >= 16, 'con 15, quien ya abrió la app no recibe el texto de las pp. 116-117');
});

test('pp. 112-113: sus deseos con would like, lo que él contó', () => {
  const t = texto('txt_u10_p112113').body;
  // Él: graduarse de inglés con C1 el próximo año, trabajar en el exterior en
  // unos años, hacerse rico, y no casarse.
  assert.match(t, /graduate from my English course with a C1 level next year/);
  assert.match(t, /work abroad in a few years/);
  assert.match(t, /I'd love to get rich/);
  assert.match(t, /I wouldn't like to get married/);
  // Termina preguntando, como el Conversation Model: él es flojo para preguntar.
  assert.match(t, /What would you like to do in the next few years\?$/);
});

test('pp. 114-115: la fiesta de su sobrina, con lo que él contó', () => {
  const t = texto('txt_u10_p114115');
  // Él: los 15 de su sobrina, hija de su hermana, el 23 de octubre, en Cartagena
  // al lado del mar, adonde viaja la familia; la organiza con su hermano; pastel y mucha comida; le
  // gusta organizar fiestas cuando es para alguien especial.
  assert.match(t.body, /My niece, my sister's daughter, is turning fifteen/);
  assert.match(t.body, /on October 23rd/);
  assert.match(t.body, /in Cartagena, next to the sea, so all my family is traveling there/);
  // Limpiar después: él lo confirmó.
  assert.match(t.body, /we're going to clean up afterwards/);
  assert.match(t.body, /My brother and I are going to organize it together/);
  assert.match(t.body, /order the cake and a lot of food/);
  assert.match(t.body, /I like to organize parties when it's for someone special/);
  // Lo que enseña la página: be going to, el presente continuo para planes,
  // y pedir un favor con Could you possibly…? / I'd be happy to.
  assert.match(t.body, /we're having a big party/);
  assert.match(t.body, /Could you possibly help out/);
  assert.match(t.body, /I'd be happy to/);
  assert.match(t.body, /Are you going to have a party soon\?$/);
  // Cada frase con su traducción: si no cuadran, el lector avisa y Flip falla.
  const { splitSentences } = h.ejecutar(`${h.extraerFuncion('splitSentences')} return { splitSentences };`, {});
  assert.equal(splitSentences(t.trans).length, splitSentences(t.body).length);
  assert.equal(splitSentences(t.body).length, 13, '"I\'d be happy to." y "Finally…" van por separado');
});

test('pp. 116-117: sus sueños, fortalezas y debilidades, con lo que él contó', () => {
  const t = texto('txt_u10_p116117');
  // Sus sueños (pp. 112-113) y lo que dijo el 7 de octubre: trabajador,
  // disciplinado y constante; necesita fluidez y ahorrar más.
  assert.match(t.body, /My dream is to graduate from my English course with a C1 level next year/);
  assert.match(t.body, /I'm hard-working, disciplined and consistent/);
  assert.match(t.body, /I could be more fluent in English/);
  assert.match(t.body, /I need to save more money/);
  assert.match(t.body, /I don't always have time for exercise/);
  assert.doesNotMatch(t.body, /I could be more disciplined/, 'él dice que es disciplinado');
  // Lo que enseña la página: My dream is to…, I need to…, dream about + -ing, un consejo del artículo.
  assert.match(t.body, /I also dream about working abroad/);
  assert.match(t.body, /"Target your weaknesses,"/);
  assert.match(t.body, /What's your dream for the future\?$/);
  const { splitSentences } = h.ejecutar(`${h.extraerFuncion('splitSentences')} return { splitSentences };`, {});
  assert.equal(splitSentences(t.trans).length, splitSentences(t.body).length);
});
