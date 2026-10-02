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

const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'fixU2P14', 'fixU2P16',
  'fixU2P17', 'fixU2P18', 'fixU2P19', 'fixU2P20', 'fixU2P21', 'fixU2P22', 'fixU2P23', 'vocabKey'];
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

// ── pp. 17-23 ─────────────────────────────────────────────────────────────
// Lo que más hubo: gramática y tarjetas que ya estaban en otra página (la IA
// no veía las demás), la misma conversación como varias tareas de speaking, y
// en la p. 22 las afirmaciones FALSAS de un ejercicio tomadas como hechos.

const lote = (pagina, vocab, extra = {}) => ({ id: 'p' + pagina, pages: [pagina], vocab, grammar: [], exercises: [], speakingPrompts: [], ...extra });
const unidadCompleta = () => ({ a2_2: { fcProgress: { worry: { state: 'review', interval: 9 }, 'between ___ and ___': { state: 'review', interval: 2 } }, batches: [
  lote(15, [w("That's more my style."), w("That's not for me."), w("That's way past my bedtime.")]),
  lote(16, [w('bookstore'), w("Let's meet")]),
  lote(17, [w('Would you like to go to...?'), w('Maybe some other time.'), w("Sorry, I'd love to, but I'm busy then.")], {
    grammar: [{ title: 'Would you like to + verb (invitations)' }, { title: 'Prepositions on (days) and at (times and places)' }],
    speakingPrompts: ['Read and listen. Then practice the Conversation Model with a partner.',
      'CONVERSATION PAIR WORK: Change the conversation. Use a different event. Accept or decline the invitation. Then change roles.',
      'KEEP TALKING! Give more information and ask questions about the event.',
      'CHANGE PARTNERS: Change the conversation again. Choose different events.'] }),
  lote(18, [w('How do I get to the museum?'), w('turn left'), w('go to the corner of'), w('around the corner'), w('between')], {
    grammar: [{ title: 'Imperatives for giving directions', spanishTrap: "Los estudiantes a veces agregan 'You' o conjugan el verbo: 'You turns left'. En inglés basta con 'Turn left'." }] }),
  lote(19, [w('bookstore (Books)', "Nate's Books is on Park Avenue.")], {
    grammar: [{ title: 'Is there a(n)...? / Is the ... near here?' }, { title: 'Imperatives for directions' }],
    exercises: [{ type: 'multiple_choice', question: 'Which is NOT a way to say thank you on this page?', answer: 'No worries.' }],
    speakingPrompts: ['Change the conversation. Use the Vocabulary and the map (or a map of your neighborhood). Then change roles.',
      'Ask for directions to other places. Say more about the places.', 'Change the conversation again. Give directions to other places.'] }),
  lote(20, [w('worries'), w('come home from work')], { grammar: [{ title: 'make / help + person + verb (base form)',
    explanation: "En la lectura se repite: 'Music makes you happy', 'makes you feel good', 'Music helps you relax'. Después de 'make' o 'help' y la persona, va el verbo en forma base, sin 'to' (o un adjetivo después de 'make'). En español decimos 'te hace sentir' o 'te ayuda a relajarte', pero en inglés no se agrega 'to' después de 'make'.",
    spanishTrap: "Por traducir 'te ayuda a relajarte' o 'te hace sentir', muchos dicen 'helps you to relax... makes you to feel good'. Con 'make' nunca va 'to'." },
    { title: '-ing form as subject (Listening to music…)', drillSentences: [{ prompt: 'Sleep is difficult for my brother at night.', answer: 'Sleeping is difficult for my brother at night.' }] }] }),
  lote(21, [w('worry'), w('come home'), w('is more my style'), w('is not for me'), w('Same here!')], {
    grammar: [{ title: 'help / make + person + verb or adjective' }, { title: 'Present simple with frequency and time expressions' }] }),
  lote(22, [w('folk concert', "There's a folk concert at the Harris Theater on Thursday at 9:00."),
    w('dance performance', "There's a dance performance at the Pritzker Pavilion on Saturday evening."),
    w('evening', "There's a dance performance at the Pritzker Pavilion on Saturday evening."),
    w('hotel', 'The Art Institute is a famous hotel in Chicago.'), w('aquarium', 'The aquarium is open from 9 to 5.'),
    w('Is the Field Museum open at night?', "No. It's only open from 9 to 5.", { type: 'question' }),
    w('Where is the concert?', "It's at Soldier Field.", { type: 'question' }),
    w('What time is the folk concert?', "It's at 9:00.", { type: 'question' }),
    w('What day is the concert?', "It's on Sunday.", { type: 'question' })], {
    grammar: [{ title: "There's a + event + at + place + on + day + at + time" },
      { title: 'be open from ... to ...', examples: [{ en: 'The Field Museum is only open from 9 to 5.', es: 'x' }, { en: 'The aquarium is open from 9 to 5.', es: 'El acuario está abierto de 9 a 5.' }] }],
    exercises: [{ question: "There's a concert at Soldier Field ___ Sunday at 3:00.", answer: 'on' },
      { type: 'sentence_builder', question: 'Build a sentence with these words:', answer: "There's a folk concert on Thursday." },
      { question: "That's wrong. The Field Museum is only open from 9 __ 5.", answer: 'to' }] }),
  lote(23, [w("Now that's more my style!"), w("That's past my bedtime."), w("Sorry. I'd love to, but I'm busy on ___."),
    w('Too bad. Maybe some other time.'), w('Would you like to ___?'), w("Let's meet at ___."), w('How do I get to ___?'),
    w('Turn right / left on ___.'), w('Go to the corner of ___ and ___.'), w('around the corner from'), w('between ___ and ___'),
    w('a big fan of'), w('How do I get to the Harris Theater?', 'Go to the corner of Michigan and Monroe and turn right.', { type: 'question' })], {
    grammar: [{ title: 'Inviting with Would you like to / Let\'s + base verb' }, { title: 'Prepositions of time and place: on, at' }] }),
] } });
const pag = (units, n) => units.a2_2.batches.find(b => b.pages[0] === n);
const correr = units => [17, 18, 19, 20, 21, 22, 23].map(n => f[`fixU2P${n}`](units));

test('pp. 17-23: corren todas, y otra vez no cambian nada', () => {
  const units = unidadCompleta();
  assert.deepEqual(correr(units), Array(7).fill(true));
  const una = JSON.stringify(units);
  correr(units);
  assert.equal(JSON.stringify(units), una);
  assert.deepEqual(correr({ a2_2: { batches: [] } }), Array(7).fill(false), 'sin las páginas, nada');
});

test('gramática que ya enseña otra página, fuera; la que es nueva, queda', () => {
  const units = unidadCompleta();
  correr(units);
  const temas = n => pag(units, n).grammar.map(g => g.title);
  assert.deepEqual(temas(17), []);
  assert.deepEqual(temas(19), ['Is there a(n)...? / Is the ... near here?']);
  assert.deepEqual(temas(21), ['Present simple with frequency and time expressions']);
  assert.deepEqual(temas(22), ['be open from ... to ...']);
  assert.deepEqual(temas(23), ["Inviting with Would you like to / Let's + base verb"]);
});

test('la misma conversación, una vez: la de pareja y KEEP TALKING', () => {
  const units = unidadCompleta();
  correr(units);
  assert.equal(pag(units, 17).speakingPrompts.length, 2);
  assert.ok(pag(units, 17).speakingPrompts[0].startsWith('CONVERSATION PAIR WORK'));
  assert.ok(pag(units, 17).speakingPrompts[1].startsWith('KEEP TALKING'));
  assert.equal(pag(units, 19).speakingPrompts.length, 2);
});

test('las trampas que daban por error frases correctas', () => {
  const units = unidadCompleta();
  correr(units);
  const t18 = pag(units, 18).grammar[0].spanishTrap;
  assert.doesNotMatch(t18, /agregan 'You'/, '"You turn left" está bien');
  const g20 = pag(units, 20).grammar[0];
  assert.match(g20.explanation, /'help' el 'to' es opcional/);
  assert.doesNotMatch(g20.spanishTrap, /helps you to relax\.\.\./, '"helps you to relax" está bien');
  assert.equal(pag(units, 20).grammar[1].drillSentences[0].prompt, 'Listen to music helps you sleep.', '"Sleep is difficult" no tiene error');
  assert.equal(pag(units, 19).exercises[0].question, 'Which one is NOT a way to say thank you?', '"No worries" sí está en la página');
});

test('p. 22: nada sale de las afirmaciones falsas del ejercicio B', () => {
  const units = unidadCompleta();
  correr(units);
  const b = pag(units, 22);
  const palabras = b.vocab.map(v => v.word);
  for (const fuera of ['hotel', 'Where is the concert?', 'What time is the folk concert?', 'What day is the concert?']) {
    assert.ok(!palabras.includes(fuera), `"${fuera}" sigue`);
  }
  assert.ok(palabras.includes('Is the Field Museum open at night?'), 'la del globo, que sí es cierta, queda');
  const texto = JSON.stringify(b);
  assert.doesNotMatch(texto, /famous hotel|Thursday at 9:00|on Saturday evening\."|Soldier Field ___ Sunday|aquarium is open/);
  assert.deepEqual(b.exercises.map(e => e.answer), ['to']);
  // Los ejemplos nuevos, con palabras de la página (que imprime "There's").
  const impreso = `There's a folk concert at the Harris Theater on Thursday at 9:00. There's a dance performance at the
    Pritzker Pavilion on Saturday evening. Shedd Aquarium Lake Michigan The Field Museum is only open from 9 to 5.`;
  const impresas = new Set(impreso.toLowerCase().replace(/'s\b/g, ' is').match(/[a-z0-9:']+/g));
  for (const v of b.vocab.filter(x => ['folk concert', 'dance performance', 'evening', 'aquarium'].includes(x.word))) {
    for (const p of v.example.toLowerCase().match(/[a-z0-9:']+/g)) assert.ok(impresas.has(p), `"${p}" (${v.word}) no está en la página`);
  }
});

test('repetidas: se unen con la de la otra página y le pasan el progreso', () => {
  const units = unidadCompleta();
  correr(units);
  assert.deepEqual(pag(units, 19).vocab, []);
  assert.deepEqual(pag(units, 21).vocab.map(v => v.word), ['Same here!']);
  assert.deepEqual(pag(units, 23).vocab.map(v => v.word), ['a big fan of', 'How do I get to the Harris Theater?']);
  assert.deepEqual(units.a2_2.fcProgress, { worries: { state: 'review', interval: 9 }, between: { state: 'review', interval: 2 } });
  assert.equal(pag(units, 23).vocab[1].example, 'Turn right / left on ___. Go to the corner of ___ and ___.', 'el mapa no da la ruta');
});

test('el arranque y la restauración corren las pp. 17-23', () => {
  const migrar = h.extraerFuncion('migrateState');
  const restaurar = h.extraerFuncion('applyPageFixes');
  for (const n of [17, 18, 19, 20, 21, 22, 23]) {
    assert.match(migrar, new RegExp(`\\['_u2P${n}V1', fixU2P${n}\\]`));
    assert.match(restaurar, new RegExp(`\\bfixU2P${n}\\b`));
  }
});
