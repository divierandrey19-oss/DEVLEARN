/**
 * El contenido de Verbs: los pasados agrupados por sonido.
 *
 * Él pidió los regulares que faltaban, por familias. Lo que puede salir mal al
 * meter verbos a mano es justo lo que se revisa aquí: un verbo repetido en
 * dos familias (el globito lo contaría dos veces), un ejemplo que no resalta
 * el pasado que se pide, o un regular metido en la familia de otro sonido.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const inicio = fuente.indexOf('const VERB_FAMILIES = [');
const fin = fuente.indexOf('\n];\n', inicio);
assert.ok(inicio > 0 && fin > inicio, 'no se encontró VERB_FAMILIES');
const VERB_FAMILIES = new Function(`return ${fuente.slice(inicio + 'const VERB_FAMILIES = '.length, fin + 2)};`)();

const verbos = VERB_FAMILIES.flatMap(f => f.verbs.map(v => ({ f, v })));

test('ningún verbo está en dos familias', () => {
  const bases = verbos.map(x => x.v[0]);
  const repetidos = bases.filter((b, i) => bases.indexOf(b) !== i);
  assert.deepEqual(repetidos, []);
});

test('cada verbo trae sus seis datos', () => {
  for (const { f, v } of verbos) {
    assert.equal(v.length, 6, `${f.id}:${v[0]}`);
    assert.ok(v.every(x => typeof x === 'string' && x.trim()), `${f.id}:${v[0]} tiene un dato vacío`);
  }
});

test('el ejemplo resalta el pasado que pide la tarjeta', () => {
  // "was / were": basta con que resalte uno de los pasados.
  const mal = verbos
    .filter(({ v }) => !v[1].split('/').some(p => v[4].includes(`<b>${p.trim()}</b>`)))
    .map(({ f, v }) => `${f.id}:${v[0]}`);
  assert.deepEqual(mal, []);
});

test('los regulares terminan en -ed', () => {
  const mal = verbos.filter(({ f, v }) => f.kind === 'reg' && !v[1].endsWith('ed')).map(({ v }) => v[0]);
  assert.deepEqual(mal, []);
});

test('cada regular está en la familia de su sonido', () => {
  // La pronunciación del pasado tiene que terminar en el sonido de la familia.
  // La sílaba extra es t/d + ɪd; "played" /pleɪd/ termina en ɪd por el
  // diptongo eɪ, y es /d/.
  const silabaExtra = /[td]ɪd\/$/;
  const ok = {
    '/ɪd/': ipa => silabaExtra.test(ipa),
    '/t/':  ipa => ipa.endsWith('t/'),
    '/d/':  ipa => ipa.endsWith('d/') && !silabaExtra.test(ipa),
  };
  const mal = verbos
    .filter(({ f }) => f.kind === 'reg')
    .filter(({ f, v }) => !ok[f.sound](v[2]))
    .map(({ f, v }) => `${f.id}:${v[0]} ${v[2]}`);
  assert.deepEqual(mal, []);
});

test('cada familia explica su regla', () => {
  // La hoja "?" lee when, rule y demo.
  for (const f of VERB_FAMILIES) {
    assert.ok(f.when && f.rule && Array.isArray(f.demo) && f.demo.length, `${f.id} sin regla completa`);
  }
});

test('los regulares que él pidió están', () => {
  const bases = new Set(verbos.map(x => x.v[0]));
  for (const b of ['accept', 'celebrate', 'fix', 'drop', 'explain', 'borrow', 'cry', 'plan']) {
    assert.ok(bases.has(b), `falta ${b}`);
  }
});
