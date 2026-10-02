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
  for (const [id, titulo] of [['txt_u10_p109', 'U10 · pág 109'], ['txt_u10_p110111', 'U10 · pág 110 - 111'], ['txt_u10_p112113', 'U10 · pág 112 - 113']]) {
    const t = texto(id);
    assert.ok(t, `falta ${id}`);
    assert.equal(t.title, titulo, 'el título agrupa por unidad ("U10 · …")');
    assert.ok(t.trans && t.trans.length > 200, 'con su traducción al español');
  }
});

test('máximo 170 palabras, como él pidió', () => {
  for (const id of ['txt_u10_p109', 'txt_u10_p110111', 'txt_u10_p112113']) {
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
  assert.ok(m && Number(m[1]) >= 14, 'con 13, quien ya abrió la app no recibe el texto de las pp. 112-113');
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
