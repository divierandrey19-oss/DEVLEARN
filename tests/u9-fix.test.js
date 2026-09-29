/**
 * La Unit 9 revisada contra las fotos (su respaldo del 29 de septiembre).
 *
 * Lo que tenía: letra mal leída ("Jen" por Teri, "coat" por cast), ejemplos
 * armados mezclando las dos opciones de un ejercicio ("I could have to invite
 * him"), las opciones de un "circle the correct answer" tomadas como hechos
 * (tarjetas que afirmaban cosas falsas), un ejercicio que adivinaba un audio,
 * trampas del español falsas, y tarjetas repetidas ("kayaking" y "go
 * kayaking", "burn" y "burned").
 *
 * Lo delicado: él ya había estudiado sus 350 tarjetas. Renombrar o quitar una
 * repetida no puede borrarle el progreso.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'vocabKey', 'fixU9Pages',
  'fixU9P97', 'fixU9P100', 'fixU9P102', 'fixU9P104', 'fixU9P106', 'fixU9P107', 'fixU9Phrasal'];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const prog = interval => ({ state: 'review', interval });
const w = (word, example = '', extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });

// ── El progreso no se pierde ───────────────────────────────────────────────

test('al renombrar una tarjeta, su progreso la sigue', () => {
  const u = { fcProgress: { hates: prog(9) } };
  f.moverProgreso(u, 'hates', 'hate');
  assert.deepEqual(u.fcProgress, { hate: prog(9) });
});

test('si las dos repetidas tienen progreso, queda el de la que ya se sabe mejor', () => {
  const u = { fcProgress: { burned: prog(20), burn: prog(4) } };
  f.moverProgreso(u, 'burned', 'burn');
  assert.deepEqual(u.fcProgress, { burn: prog(20) });
  const v = { fcProgress: { fell: prog(2), fall: prog(15) } };
  f.moverProgreso(v, 'fell', 'fall');
  assert.deepEqual(v.fcProgress, { fall: prog(15) });
});

test('unir quita la repetida de su página y le pasa el progreso a la que queda', () => {
  const units = { a2_9: { fcProgress: { kayaking: prog(8) }, batches: [
    { id: 'x', pages: [104], vocab: [w('kayaking'), w('go kayaking')], grammar: [], exercises: [] }] } };
  f.fixPageContent(units, { unit: 'a2_9', page: 104, unir: [['kayaking', 'go kayaking']] });
  assert.deepEqual(units.a2_9.batches[0].vocab.map(v => v.word), ['go kayaking']);
  assert.deepEqual(units.a2_9.fcProgress, { 'go kayaking': prog(8) });
});

test('"go kayaking" y "kayaking" son la misma tarjeta; "go out" y "go home" no se tocan', () => {
  assert.equal(f.vocabKey('go kayaking'), f.vocabKey('kayaking'));
  assert.equal(f.vocabKey('go bike riding'), f.vocabKey('bike riding'));
  assert.equal(f.vocabKey('go out'), 'go out');
  assert.equal(f.vocabKey('go home'), 'go home');
});

test('un ejercicio puntual cambia su respuesta sin tocar ese texto como opción de otro', () => {
  const units = { a2_9: { batches: [{ pages: [107], vocab: [], grammar: [], exercises: [
    { question: 'Where does Martha Roberts work?', options: ['in a gym', 'in a physical therapy center', 'both a and b are correct'], answer: 'both a and b are correct' },
  ] }] } };
  f.fixPageContent(units, { unit: 'a2_9', page: 107,
    ejercicios: [{ question: 'Where does Martha Roberts work?', set: { answer: 'in a physical therapy center' } }] });
  const e = units.a2_9.batches[0].exercises[0];
  assert.equal(e.answer, 'in a physical therapy center');
  assert.ok(e.options.includes('both a and b are correct'), 'la opción queda como distractor');
});

// ── Las páginas ────────────────────────────────────────────────────────────

function unidad() {
  return { a2_9: { fcProgress: {}, batches: [
    { id: 'b_1789994027452_wlve6t', vocab: [w('teach', 'Jen has to teach a Pilates class now.'), w('started', 'It started late.')],
      grammar: [{ title: 'have to / has to for present obligations',
        spanishTrap: "Los colombianos tienden a conjugar el verbo después de 'have to' (ejemplo: decir 'I have to works' en vez de 'I have to work') porque en español sí se conjuga: 'tengo que trabajar' tiene 'trabajar' conjugado.",
        examples: [{ en: 'Jen has to teach a Pilates class now.', es: 'Jen tiene que enseñar una clase de Pilates ahora.' }] }],
      exercises: [], speakingPrompts: ['Choose one of the places…', "Does he have to go right home after class tonight? (Yes, he does. / No, he doesn't.)"] },
    { id: 'b_1790167514992_95ntjo', vocab: [w('invite', 'I could have to invite him.'), w('hates', 'He says he hates indoor activities.')],
      grammar: [], exercises: [], speakingPrompts: ['Complete the conversation. Circle the correct words.'] },
    { id: 'b_1790367112077_49wdae', vocab: [w('coat', 'They gave me a coat.'), w('cast'), w("don't rest", 'When you wear a cast, your muscles don\'t rest.'),
      w('set broken bones', 'Her work is to set broken bones.'), w('gave', 'They gave me a coat.')],
      grammar: [], exercises: [{ question: 'What does Ms. Roberts use in her physical therapy?', answer: 'all of the above' }], speakingPrompts: [] },
    { id: 'pv_a2_9', title: 'Phrasal verbs — Unit 9', vocab: [w('go bowling', '', { type: 'phrasal verb' }), w('fall down', '', { type: 'phrasal verb' }),
      w('go out', '', { type: 'phrasal verb' })] },
  ] } };
}

test('las páginas reciben su número del libro, por su id', () => {
  const units = unidad();
  assert.equal(f.fixU9Pages(units), true);
  assert.deepEqual(units.a2_9.batches.map(b => (b.pages || [])[0]), [100, 102, 107, undefined]);
  units.a2_9.batches[0].pages = [999];
  f.fixU9Pages(units);
  assert.deepEqual(units.a2_9.batches[0].pages, [999], 'no pisa un número que ya tenga');
});

test('p. 100: Teri, no Jen; y la trampa falsa sobre "tener que" se va', () => {
  const units = unidad();
  units.a2_9.fcProgress = { started: prog(6) };
  f.fixU9Pages(units);
  assert.equal(f.fixU9P100(units), true);
  const b = units.a2_9.batches[0];
  assert.match(b.vocab[0].example, /^Teri has to teach/);
  assert.equal(b.grammar[0].examples[0].en, 'Teri has to teach a Pilates class now. Can she call you back later?');
  assert.doesNotMatch(b.grammar[0].spanishTrap, /conjugado/);
  assert.equal(b.vocab[1].word, 'start');
  assert.deepEqual(units.a2_9.fcProgress, { start: prog(6) }, 'el progreso de "started" pasa a "start"');
  assert.deepEqual(b.speakingPrompts, ['Choose one of the places…'], 'los ejemplos de gramática no son tareas');
});

test('p. 102: ningún ejemplo mezcla las dos opciones del ejercicio del libro', () => {
  const units = unidad();
  f.fixU9Pages(units);
  f.fixU9P102(units);
  const b = units.a2_9.batches[1];
  assert.equal(b.vocab.find(v => v.word === 'invite').example, 'I could invite him.');
  assert.ok(b.vocab.some(v => v.word === 'hate'));
  assert.deepEqual(b.speakingPrompts, []);
});

test('p. 107: nada de lo que era una opción falsa queda como hecho, y "coat" era "cast"', () => {
  const units = unidad();
  units.a2_9.fcProgress = { coat: prog(10), cast: prog(3) };
  f.fixU9Pages(units);
  f.fixU9P107(units);
  const b = units.a2_9.batches[2];
  const ps = b.vocab.map(v => v.word);
  assert.ok(!ps.includes('coat') && !ps.includes("don't rest"));
  assert.deepEqual(units.a2_9.fcProgress, { cast: prog(10) }, 'lo que estudió como "coat" queda en "cast"');
  assert.match(b.vocab.find(v => v.word === 'set broken bones').example, /^A doctor sets the broken bone/);
  assert.equal(b.vocab.find(v => v.word === 'give').example, 'They gave me a cast.');
  assert.equal(b.exercises[0].answer, 'special tables and equipment');
});

test('el lote de phrasal verbs: solo los que lo son quedan como phrasal verb', () => {
  const units = unidad();
  f.fixU9Phrasal(units);
  const b = units.a2_9.batches[3];
  assert.equal(b.title, 'Phrasal verbs & expressions — Unit 9');
  assert.equal(b.vocab.find(v => v.word === 'go bowling').type, 'phrase');
  assert.equal(b.vocab.find(v => v.word === 'fall down').type, 'phrasal verb');
  assert.ok(!b.vocab.some(v => v.word === 'go out'), '"go out" ya está en la p. 100, con el mismo progreso');
});

test('el ejercicio que adivinaba el audio de Clemson se quita', () => {
  assert.match(h.extraerFuncion('fixU9P104'), /quitarEjercicios: \["According to the page, which is Clemson's main idea\?"\]/);
});

test('en el arranque, los números de página van antes que las correcciones', () => {
  const m = h.extraerFuncion('migrateState');
  const paginas = m.indexOf("if (!merged._u9PagesV1 && fixU9Pages(merged.units)) merged._u9PagesV1 = true;");
  const p97 = m.indexOf("['_u9P97V1', fixU9P97]");
  assert.ok(paginas > 0 && p97 > paginas);
  const aplicar = h.extraerFuncion('applyPageFixes');
  assert.ok(aplicar.indexOf('fixU9Pages') < aplicar.indexOf('fixU9P97'), 'también al recuperar desde un respaldo');
});
