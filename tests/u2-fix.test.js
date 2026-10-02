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

const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'fixU2P14', 'fixU2P16', 'vocabKey'];
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

// ── p. 16 ─────────────────────────────────────────────────────────────────
// El afiche dice "THE BURKE GALLERY · OPENING RECEPTION · TUESDAY 8:00 PM" y
// salió 6:00. concert, exhibit y talk repetían las de la p. 14; "around the
// corner", la de la p. 15; y "Would you like to…?", la gramática de la p. 15.

const IMPRESO_16 = `When's the concert? It's on Friday. Would you like to go? Where's the exhibit?
  It's at the City Museum. THE BURKE GALLERY "ART OF THE SIXTIES" OPENING RECEPTION TUESDAY 8:00 PM
  Hey, Cindy! It's right around the corner from my office.`;

const unidad2 = ({ conP15 = true } = {}) => ({ a2_2: {
  fcProgress: { exhibit: { state: 'review', interval: 4 } },
  batches: [
    { id: 'p14', pages: [14], vocab: [w('a concert', 'a classical music concert'), w('an exhibit', 'I love art exhibits at museums.'), w('a talk', 'a talk about an interesting topic')] },
    ...(conP15 ? [{ id: 'p15', pages: [15], vocab: [w('right around the corner', "It's right around the corner from Club Six.")],
      grammar: [{ title: 'Making invitations: Would you like to / Are you in the mood for' }] }] : []),
    { id: 'p16', pages: [16], vocab: [
      w('opening reception', 'The opening reception is at 6:00 PM.'),
      w('concert', "When's the concert?"), w('exhibit', "Where's the exhibit?"), w('talk', "There's an interesting talk at Main Street Books."),
      w('around the corner', "It's right around the corner from my office."), w('bookstore', "Let's meet at the bookstore at 6:15."),
    ], grammar: [
      { title: 'Prepositions of time: on, in, at', drillSentences: [{ prompt: 'The opening reception is on Tuesday ___ 6:00 PM.', answer: 'at' }] },
      { title: "Inviting with 'Would you like to...?'" },
    ] },
  ],
} });
const p16 = units => units.a2_2.batches.find(b => b.pages[0] === 16);

test('p. 16: la inauguración es el martes a las 8:00, como dice el afiche', () => {
  const units = unidad2();
  assert.equal(f.fixU2P16(units), true);
  const r = p16(units).vocab.find(v => v.word === 'opening reception');
  assert.equal(r.example, 'The opening reception is on Tuesday at 8:00 PM.');
  assert.equal(p16(units).grammar[0].drillSentences[0].prompt, 'The opening reception is on Tuesday ___ 8:00 PM.');
  assert.doesNotMatch(JSON.stringify(units), /6:00 PM/);
  // "It's", "Where's": la página trae el is contraído.
  const impresas = new Set(IMPRESO_16.toLowerCase().replace(/'s\b/g, ' is').match(/[a-z0-9:']+/g));
  for (const palabra of r.example.toLowerCase().match(/[a-z0-9:']+/g)) {
    assert.ok(impresas.has(palabra), `"${palabra}" no está en la página`);
  }
});

test('p. 16: las repetidas se quitan y su progreso pasa a la que queda', () => {
  const units = unidad2();
  f.fixU2P16(units);
  assert.deepEqual(p16(units).vocab.map(v => v.word), ['opening reception', 'bookstore']);
  assert.deepEqual(units.a2_2.fcProgress, { 'an exhibit': { state: 'review', interval: 4 } });
  assert.deepEqual(p16(units).grammar.map(g => g.title), ['Prepositions of time: on, in, at'], 'Would you like to queda en la p. 15');
  const una = JSON.stringify(units);
  f.fixU2P16(units);
  assert.equal(JSON.stringify(units), una, 'correrla otra vez no cambia nada');
});

test('p. 16 sin la p. 15 en el aparato: no se quita lo que no tiene dónde quedar', () => {
  const units = unidad2({ conP15: false });
  assert.equal(f.fixU2P16(units), false, 'la bandera espera a que llegue la p. 15');
  const palabras = p16(units).vocab.map(v => v.word);
  assert.ok(palabras.includes('around the corner'));
  assert.ok(!palabras.includes('concert'), 'las de la p. 14 sí se unen');
  assert.equal(p16(units).grammar.length, 2);
  assert.equal(f.fixU2P16({ a2_2: { batches: [] } }), false);
});

test('una palabra con y sin artículo es la misma tarjeta', () => {
  assert.equal(f.vocabKey('a concert'), f.vocabKey('concert'));
  assert.equal(f.vocabKey('an exhibit'), f.vocabKey('Exhibit'));
  assert.equal(f.vocabKey('the mall'), f.vocabKey('mall'));
  assert.notEqual(f.vocabKey('around the corner'), f.vocabKey('right around the corner'), 'solo el artículo del principio');
  assert.match(h.extraerFuncion('migrateState'), /if \(!merged\._u2P16V1 && fixU2P16\(merged\.units\)\) merged\._u2P16V1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /\bfixU2P16\b/);
});
