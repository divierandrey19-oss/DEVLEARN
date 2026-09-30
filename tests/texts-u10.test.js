/**
 * Los textos de la Unit 10, que él memoriza para hablar en clase.
 *
 * Se escriben de a poco, solo los de las páginas de la clase siguiente, a
 * partir de sus respuestas: su vida real, no una inventada. Pidió máximo 150
 * palabras. Y se entregan subiendo SEED_VERSION: sin eso, quien ya abrió una
 * versión anterior nunca los recibe (pasó dos veces, ver CLAUDE.md).
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
  for (const [id, titulo] of [['txt_u10_p109', 'U10 · pág 109'], ['txt_u10_p110111', 'U10 · pág 110 - 111']]) {
    const t = texto(id);
    assert.ok(t, `falta ${id}`);
    assert.equal(t.title, titulo, 'el título agrupa por unidad ("U10 · …")');
    assert.ok(t.trans && t.trans.length > 200, 'con su traducción al español');
  }
});

test('máximo 150 palabras, como él pidió', () => {
  for (const id of ['txt_u10_p109', 'txt_u10_p110111']) {
    assert.ok(palabras(texto(id).body) <= 150, `${id} tiene ${palabras(texto(id).body)} palabras`);
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
  assert.ok(m && Number(m[1]) >= 13, 'con 12, quien ya abrió la app no recibe los textos nuevos');
});
