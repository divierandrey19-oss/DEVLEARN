/**
 * La Unit 2, revisada contra las fotos a medida que él la sube (su respaldo del
 * 2 de octubre). Es la unidad que faltaba para el examen final.
 *
 * p. 14: la página solo imprime "= like" junto al emoji. El prompt pedía armar
 * el ejemplo solo con palabras impresas y salió "I like a basketball game",
 * porque la página dice "a basketball game". Para hablar de algo en general se
 * dice en plural, como enseña la gramática de esa misma página. El prompt ahora
 * deja cambiar la forma de una palabra impresa para que la frase sea natural.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixU2P14'];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

// Lo que se ve en la foto de la p. 14.
const IMPRESO_14 = `What's more your style? What's your opinion of each entertainment event? Circle the emoji.
  love like don't like no opinion
  a classical music concert / a rock concert at a stadium / a play with my favorite actors /
  a late-night movie at a theater / an art exhibit at a museum / a basketball game /
  a dance performance / a talk about an interesting topic
  Entertainment events: a concert, a play, a movie, an exhibit, a game, a performance, a talk.
  Compare your surveys. Do you have the same opinions? I love art exhibits at museums. How about you?`;

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const unidad = () => ({ a2_2: {
  fcProgress: { like: { state: 'review', interval: 3 } },
  batches: [
    { id: 'p13', pages: [13], vocab: [w('prefer', 'Which do you prefer? Rock concerts or soccer games?')] },
    { id: 'p14', pages: [14], vocab: [
      w('like', 'I like a basketball game.', { translation: 'gustar' }),
      w("don't like", "I don't like rock concerts."),
      w('no opinion', '😐 = no opinion'),
    ] },
  ],
} });

const p14 = units => units.a2_2.batches[1].vocab;

test('p. 14: "like" con un ejemplo natural, en plural para hablar en general', () => {
  const units = unidad();
  assert.equal(f.fixU2P14(units), true);
  const like = p14(units).find(v => v.word === 'like');
  assert.equal(like.example, 'I like basketball games.');
  assert.equal(like.exampleTranslation, 'Me gustan los partidos de baloncesto.');
  assert.equal(like.translation, 'gustar', 'lo demás de la tarjeta queda igual');
  assert.deepEqual(units.a2_2.fcProgress.like, { state: 'review', interval: 3 }, 'no pierde el progreso');
  assert.equal(units.a2_2.batches[0].vocab[0].example, 'Which do you prefer? Rock concerts or soccer games?', 'la p. 13 no se toca');
});

test('el ejemplo nuevo sale de palabras impresas en la página (con plural)', () => {
  const units = unidad();
  f.fixU2P14(units);
  const impresas = new Set(IMPRESO_14.toLowerCase().match(/[a-z']+/g));
  const ejemplo = p14(units).find(v => v.word === 'like').example;
  for (const palabra of ejemplo.toLowerCase().match(/[a-z']+/g)) {
    assert.ok(impresas.has(palabra) || impresas.has(palabra.replace(/s$/, '')), `"${palabra}" no está en la página`);
  }
});

test('si él editó el ejemplo, no se toca; sin la página, nada', () => {
  const units = unidad();
  p14(units)[0].example = 'I like dance performances.';
  f.fixU2P14(units);
  assert.equal(p14(units)[0].example, 'I like dance performances.');
  assert.equal(f.fixU2P14({ a2_2: { batches: [] } }), false);
  assert.equal(f.fixU2P14({}), false);
});

test('correr la corrección otra vez no cambia nada', () => {
  const units = unidad();
  f.fixU2P14(units);
  const una = JSON.stringify(units);
  f.fixU2P14(units);
  assert.equal(JSON.stringify(units), una);
});

test('el arranque y la restauración de páginas la corren', () => {
  assert.match(h.extraerFuncion('migrateState'), /if \(!merged\._u2P14V1 && fixU2P14\(merged\.units\)\) merged\._u2P14V1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /\bfixU2P14\b/);
});
