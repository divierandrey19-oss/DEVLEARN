/**
 * La Unit 7, revisada contra sus fotos (su respaldo del 2 de octubre). Se
 * analizó en septiembre, antes de las reglas de "las opciones no son hechos",
 * "forma base" y "trampa en español", y salieron cosas falsas:
 *
 * - p. 83: UNDERSTAND FROM CONTEXT pide encerrar la palabra correcta, y las
 *   opciones quedaron de ejemplo: "out of the question… it means it's
 *   acceptable", "A perk is an unusual offer", "it is easy to decline".
 * - p. 80: las tres opciones de cada frase de LISTEN FOR DETAILS, como hechos
 *   ("They returned her kids").
 * - p. 79: "You can say that again" = "puedes decirlo otra vez".
 * - p. 78: el email de Claire en presente ("The bus finally arrive at noon").
 *
 * Él pidió corregir todo, números de página y preguntas por página.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 11 }, (_, i) => 73 + i);
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'hayLote',
  'u7Lote', 'fixU7Pages', 'quitarTemaRepetido', ...PAGINAS.map(n => `fixU7P${n}`), 'fixU7Phrasal',
  'questionCard', 'addQuestionCards', 'addPageExtras', 'addU7Questions', ...PAGINAS.map(n => `addU7P${n}Questions`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const lote = (n, extra) => ({ id: f.u7Lote(n), vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...extra });
const pagina = (units, n) => units.a2_7.batches.find(b => b.id === f.u7Lote(n));
const palabra = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);
const todas = units => units.a2_7.batches.flatMap(b => b.vocab || []);

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  73: 'Lesson 4 Discuss some hassles of travel',
  75: `Marta: As a matter of fact, no. We just stayed home and took a staycation. Marta: Well, basically we slept late
    and went to the beach. Brett: We sure did! The weather was so fantastic.`,
  76: "Were there lots of people? (Yes, there were. / No, there weren't.)",
  78: `Hey, Lynn—quick update: We got up early this morning and packed all our clothes into our luggage. Then we
    checked out of the hotel and took a taxi to the station, where we met the other people on the tour. So we all got
    on the bus and drove into the mountains. The trip took four hours, but it wasn't at all boring because the scenery
    was beautiful. The bus finally arrived at noon, and we had lunch in a cute restaurant. I posted a photo on
    Instasnap—have a look there. After lunch, we took it easy and just relaxed. We left at about 6:00 and are now on
    the way to the airport. call → called like → liked study → studied shop → shopped buy bought come came do did
    drive drove eat ate find found fly flew get got go went They went to the beach. / They didn't go shopping.`,
  79: `1 A: What kind of seat would you like? A window or an aisle? A: Hello, Paul? It's Nora. Listen, I missed the 5:12
    flight to Miami. Role-play the conversation, inventing the place you're going and the flight, train, or bus times.
    Ask or tell your partner about . . . the kind of seat [you] got whether the [flight] is non-stop the arrival time`,
  80: `Check whether the person had a good or bad vacation experience—or a mixture of both. 2 The airline lost their
    (ticket / camera / luggage). 3 Someone stole their tablet (on the first day / on the third day / when they
    arrived). 1 The people were (warm and friendly / cold and unfriendly / unhappy). 2 They really liked their (hotel
    room / tour / tour guide). 1 They got back (last weekend / yesterday / three days ago). 3 They got (aisle seats /
    seats together / window seats). 1 The food at the Miami hotel was (fantastic / pretty bad / terrible). 2 The people
    were (cold / nice / unfriendly). 3 They returned her (kids / car / bike).`,
  81: '1 /d/ 2 /t/ 3 /ɪd/ played rained liked missed wanted needed 1 tried 2 walked 3 visited 4 checked 5 danced 6 waited I was in the mood for ___ , but ___ .',
  82: `Your plane boards on time, takes off on time, and lands on time. You feel lucky because you've scored an aisle
    seat in the first row. If you have some time to kill, it's possible that waiting two hours for the next flight
    isn't a problem for you. And the $200 voucher is tempting—you could use that on your next trip! The value of the
    voucher can go up and up until it's too good to refuse.`,
  83: `1 If someone "volunteers" to get off the plane, she or he (has to / agrees to / pays to) get off. 3 If an
    airline "compensates" you, it gives you (a voucher / the ticket / another seat on the flight). 4 If an offer is
    "tempting" to you, it is (hard / easy / impossible) to decline. 5 If someone says that something is "out of the
    question," it means it's (good / acceptable / not acceptable). 6 A "perk" is an (attractive / unusual / impossible)
    offer. a limo a ferry a helicopter Also: a bus a train a taxi a ship an airplane a subway When was the last time
    you took a ferry? B PAIR WORK Ask your partner questions about the means of transportation she or he checked.
    The ___ drove me crazy. The ___ didn't work. First, I got carsick in the airport limo.`,
};

/** Las palabras de una frase nueva tienen que estar impresas (con plural, -s, -ed o -ing). */
function estaImpresa(frase, n) {
  const impresas = new Set(IMPRESO[n].toLowerCase().match(/[a-z0-9$:'ɪ-]+/g));
  const forma = p => [p, p.replace(/s$/, ''), p.replace(/ing$/, ''), p.replace(/e?d$/, ''), `${p}s`, `${p}ed`, `${p}d`];
  for (const p of frase.toLowerCase().match(/[a-z0-9$:'ɪ-]+/g)) {
    assert.ok(forma(p).some(x => impresas.has(x)), `"${p}" (de "${frase}") no está impreso en la p. ${n}`);
  }
}

// ── Una unidad con lo que salió del análisis, en lo que se corrige ────────

function unidad() {
  return { a2_7: {
    fcProgress: { arriving: { interval: 4 }, 'stayed home': { interval: 5 }, 'give you a hand': { interval: 9 },
      'give someone a hand': { interval: 2 }, perk: { interval: 7 }, perks: { interval: 3 }, Montevideo: { interval: 1 } },
    batches: [
      lote(73, {
        vocab: [w('arriving', 'Greet someone arriving from a trip.'), w('discuss', 'Discuss some hassles of travel.', { translation: 'discutir / hablar sobre' }),
          w('hassles', 'Discuss some hassles of travel.'), w('travel', 'Vacations and Travel is an interesting topic.')],
        grammar: [{ title: 'Adjectives ending in -ing to describe experiences' }, { title: 'Infinitives after verbs of preference (like)' }],
      }),
      lote(74, {
        grammar: [{ title: "Expressing opinions with 'In my opinion' and 'I think'",
          explanation: "Para expresar opiniones en inglés, usamos frases como 'in my opinion' (en mi opinión) o 'I think' (creo que). A diferencia del español donde 'creo que' lleva subjuntivo a veces, en inglés 'I think' siempre va seguido de indicativo normal.",
          spanishTrap: "The comma after 'in my opinion' is required in English. Spanish 'creo que' doesn't need comma, but English 'I think' can work with or without it.",
          examples: [{ en: 'In my opinion, taking a cruise is exciting.', es: 'x' }],
          commonErrors: [{ wrong: 'In my opinion taking a cruise is exciting.', correct: 'In my opinion, taking a cruise is exciting.', why: "Always use comma after 'in my opinion'" }] }],
        speakingPrompts: ['Which activities are exciting? Which are relaxing? Which are interesting?', 'In my opinion, taking a cruise is exciting.',
          'Really? I think taking a cruise is relaxing. Going surfing is exciting!'],
      }),
      lote(75, {
        vocab: [w('staycation', 'As a matter of fact, no. We just stayed home and took a vacation.'), w('gotta run', 'Thanks, Brett. Gotta run now.'),
          w('the end of the world', "Well, luckily it didn't have any money in it, so it wasn't the end of the world."),
          w('stayed home', 'We just stayed home and took a vacation.'), w('go away', 'Did you go away?')],
        grammar: [{ title: 'Informal Conversational Phrases',
          spanishTrap: "Colombians often translate literally from Spanish phrases like 'Tengo que correr' for 'gotta run' or 'Fue bueno viéndote' for 'It was great seeing you', which sound unnatural in English.",
          commonErrors: [{ wrong: 'I have to run now.', correct: 'Gotta run now.' }, { wrong: 'It was good to see you.', correct: 'It was great seeing you.' }] }],
      }),
      lote(76, {
        vocab: [w('were', 'Where were there lots of people?'), w("weren't", 'How were the food on the cruise?'), w('flight', 'The flight was very bumpy.'),
          w('bumpy', 'The flight was very bumpy.', { translation: 'agitado' })],
        grammar: [{ title: 'Past tense of be (was/were)', examples: [{ en: 'Where were there lots of people?', es: '¿Dónde había mucha gente?' }] }],
      }),
      lote(77, {
        vocab: [w('kidding', 'Really? No kidding!'), w('give you a hand', 'Hey, can I give you a hand?')],
        grammar: [{ title: "Past Simple with 'was' and 'were'" }, { title: 'How long questions with Past Simple' }],
      }),
      lote(78, {
        vocab: [w('arrive', 'The bus finally arrive at noon.'), w('met', 'I met Lynn at the station.'), w('took', 'I took a photo on Instagram.'),
          w('get', 'So we all get on the bus.'), w('bus', 'So we all get on the bus and drive into the mountains.'), w('aisle seat', 'She had an aisle seat.'),
          w('get up', 'We get up early this morning.'), w('check out', 'Then we check out of the hotel.'), w('window seat', 'I got a window seat.')],
        grammar: [{ title: 'Simple Past Tense: Irregular Verbs',
          spanishTrap: "Algunos verbos irregulares del inglés tienen formas similares al infinitivo en español (meet → met, read → read), pero la pronunciación cambia. Otros verbos comunes del español son regulares, pero en inglés son irregulares: ir (fui) → go (went), tener (tuve) → have (had).",
          examples: [{ en: 'I took a photo on Instagram.', es: 'Tomé una foto en Instagram.' }] },
          { title: "Past Tense of 'to be' (was/were)" }],
        exercises: [{ type: 'sentence_builder', question: 'Build a sentence with these words:', answer: 'I met Lynn at the station.', words: ['I', 'met', 'Lynn'] }],
      }),
      lote(79, {
        vocab: [w('You can say that again', 'You can say that again!', { translation: 'Puedes decirlo otra vez' }), w('seat', 'We have one in the car.'),
          w('Montevideo', 'Do you want to Montevideo?'), w('Miami', 'I missed the 5:12 flight to Miami.'), w('Flight 3', 'Is Flight 3 a direct flight?'),
          w('ticket', 'I got a ticket on the 8:30.'), w('train', 'You can say that about the train or the plane.')],
      }),
      lote(80, {
        vocab: [w('kids', 'They returned her kids.'), w('tablet', 'Someone stole their tablet on the first day.'),
          w('when they arrived', 'Someone stole their tablet when they arrived.'), w('camera', 'The airline lost their camera.')],
        grammar: [{ title: "Past time expressions with 'ago'" }, { title: 'Past Simple: was/were' }, { title: 'Too + adjective' }],
        speakingPrompts: ['Describe a good vacation experience you had.'],
      }),
      lote(81, { vocab: [w('visited', 'I visited the mood.'), w('mood', 'I was in the mood.'), w('bumped', 'We got bumped from our flight.')] }),
      lote(82, {
        vocab: [w('land (arrive)', 'Your plane boards on time, and lands on time.'), w('end of the world', "So getting bumped isn't always the end of the world."),
          w('an aisle seat', "You feel lucky you've scored an aisle seat in the first row."),
          w('scored', "You feel lucky you've scored an aisle seat in the first row."), w('perks', 'Airlines frequently increase the perks.'),
          w('compensate', 'We can compensate you.')],
        grammar: [{ title: 'Imperative for instructions',
          spanishTrap: "Colombian speakers often add the subject pronoun ('You take your luggage') when giving instructions, but in English imperatives the subject is omitted ('Take your luggage')." }],
      }),
      lote(83, {
        vocab: [w('acceptable', "If someone says that something is out of the question, it means it's acceptable."),
          w('unusual', 'A perk is an unusual offer.'), w('easy', 'If an offer is tempting to you, it is easy to decline.'),
          w('the ticket', 'If an airline compensates you, it gives you the ticket.'), w('perk', 'A perk is an attractive offer.'),
          w('compensates', 'If an airline compensates you, it gives you a voucher.'), w('a bus', 'I took a bus on my business trip.'),
          w('drove me crazy', 'The bus drove me crazy.')],
        grammar: [{ title: 'Adjectives describing offers and situations' },
          { title: "Conditional sentences with 'if' (zero conditional)", commonErrors: [
            { wrong: 'If someone will volunteer, he gets off.', correct: 'If someone volunteers, he gets off.' },
            { wrong: 'If an offer is tempting, it will be hard to decline.', correct: 'If an offer is tempting, it is hard to decline.',
              why: 'For general truths, use present simple in the result clause, not future.' }] }],
        exercises: [{ type: 'multiple_choice', question: 'Which is INCORRECT? A perk is an ___ offer.', answer: 'all of the above are correct' }],
      }),
      { id: 'pv_a2_7', title: 'Phrasal verbs — Unit 7', vocab: [
        w('go away', 'Did you go away last summer?', { type: 'phrasal verb' }), w('gotta run', 'Gotta run now!', { type: 'phrasal verb' }),
        w('give someone a hand', 'Can I give you a hand with those bags?', { type: 'phrasal verb' }),
        w('get on', 'We all got on the bus.', { type: 'phrasal verb' }), w('find out', 'I found out.', { type: 'phrasal verb' }),
        w('take it easy', 'We took it easy.', { type: 'phrasal verb' })] },
    ],
  } };
}

function corregida() {
  const units = unidad();
  assert.equal(f.fixU7Pages(units), true);
  for (const n of PAGINAS) assert.equal(f[`fixU7P${n}`](units), true, `p. ${n}`);
  assert.equal(f.fixU7Phrasal(units), true);
  return units;
}

// ── Lo grave: lo que enseñaba algo falso ──────────────────────────────────

test('pp. 80 y 83: las opciones ya no son hechos; la frase lleva sus opciones', () => {
  const units = corregida();
  assert.equal(palabra(units, 83, 'acceptable').example, 'If someone says that something is "out of the question," it means it\'s (good / acceptable / not acceptable).');
  assert.equal(palabra(units, 83, 'unusual').example, 'A "perk" is an (attractive / unusual / impossible) offer.');
  assert.equal(palabra(units, 80, 'kids').example, 'They returned her (kids / car / bike).');
  assert.equal(palabra(units, 80, 'when they arrived').example, 'Someone stole their tablet (on the first day / on the third day / when they arrived).');
  for (const v of todas(units)) {
    assert.doesNotMatch(v.example, /it means it's acceptable|is an unusual offer|easy to decline|gives you the ticket|returned her kids|lost their camera\./, v.word);
  }
  assert.deepEqual(pagina(units, 83).exercises, [], '"all of the above are correct" no tenía sentido');
  assert.deepEqual(pagina(units, 80).grammar.map(g => g.title), ["Past time expressions with 'ago'"],
    'too + adjective salía de las opciones; was / were ya está en la p. 76');
  assert.deepEqual(pagina(units, 80).speakingPrompts, [], 'la página no trae tareas de hablar');
});

test('p. 79: "You can say that again" es "¡y que lo digas!"; sin nombres propios', () => {
  const units = corregida();
  assert.match(palabra(units, 79, 'You can say that again').translation, /^¡y que lo digas!/);
  assert.equal(palabra(units, 79, 'seat').example, 'What kind of seat would you like? A window or an aisle?');
  for (const nombre of ['Montevideo', 'Miami', 'Flight 3']) assert.equal(palabra(units, 79, nombre), undefined, nombre);
});

test('pp. 75, 76 y 78: los ejemplos son los del libro, en pasado', () => {
  const units = corregida();
  assert.equal(palabra(units, 75, 'staycation').example, 'As a matter of fact, no. We just stayed home and took a staycation.');
  assert.equal(palabra(units, 76, 'were').example, 'Were there lots of people?');
  assert.equal(palabra(units, 76, "weren't").example, "Were there lots of people? No, there weren't.");
  assert.equal(pagina(units, 76).grammar[0].examples[0].en, 'Were there lots of people?');
  assert.equal(palabra(units, 76, 'bumpy').translation, 'movido, con turbulencia');
  assert.equal(palabra(units, 78, 'arrive').example, 'The bus finally arrived at noon, and we had lunch in a cute restaurant.');
  assert.equal(palabra(units, 78, 'met').example, 'We met the other people on the tour.');
  assert.equal(palabra(units, 78, 'took').example, 'The trip took four hours.');
  assert.equal(pagina(units, 78).exercises[0].answer, 'We met the other people on the tour.');
  assert.doesNotMatch(JSON.stringify(pagina(units, 78)), /Lynn at the station|Instagram|arrive at noon/);
});

test('la gramática ya no da por error lo que está bien, y las trampas son del español', () => {
  const units = corregida();
  const errores = (n, t) => pagina(units, n).grammar.find(g => g.title === t).commonErrors.map(e => e.wrong);
  assert.deepEqual(errores(75, 'Informal Conversational Phrases'), ['Gotta to run now.', 'It was great see you.']);
  assert.deepEqual(errores(83, "Conditional sentences with 'if' (zero conditional)"),
    ['If someone will volunteer, he gets off.', 'If an offer will be tempting, it is hard to decline.']);
  assert.doesNotMatch(JSON.stringify(pagina(units, 74)), /subjuntivo|comma/);
  assert.match(pagina(units, 78).grammar[0].spanishTrap, /^En español también hay pasados irregulares/);
  for (const [n, t] of [[75, 'Informal Conversational Phrases'], [82, 'Imperative for instructions']]) {
    assert.doesNotMatch(pagina(units, n).grammar.find(g => g.title === t).spanishTrap, /speakers|Colombians/, `p. ${n}`);
  }
  assert.deepEqual(pagina(units, 74).speakingPrompts, ['Which activities are exciting? Which are relaxing? Which are interesting?'],
    'los globos no son tareas');
  assert.deepEqual(pagina(units, 73).grammar.map(g => g.title), ['Adjectives ending in -ing to describe experiences']);
  assert.equal(palabra(units, 73, 'discuss').translation, 'hablar de, conversar sobre');
});

test('los ejemplos nuevos están impresos en la página', () => {
  const units = corregida();
  const nuevos = [[73, 'travel'], [75, 'staycation'], [75, 'stay home'], [76, 'were'], [76, "weren't"], [78, 'arrive'], [78, 'met'], [78, 'took'],
    [78, 'get on'], [78, 'bus'], [78, 'get up'], [78, 'check out'], [79, 'seat'], [79, 'train'], [80, 'kids'], [80, 'tablet'], [80, 'camera'],
    [81, 'visited'], [81, 'be in the mood for'], [82, 'land (arrive)'], [82, 'score'], [83, 'acceptable'], [83, 'unusual'], [83, 'easy'],
    [83, 'drive someone crazy']];
  for (const [n, word] of nuevos) estaImpresa(palabra(units, n, word).example, n);
});

// ── Forma base, repetidas y progreso ──────────────────────────────────────

test('renombrar y unir repetidas no le quita progreso', () => {
  const units = corregida();
  const p = units.a2_7.fcProgress;
  assert.equal(palabra(units, 73, 'arriving'), undefined, 'arriving era "arrive" de la p. 78');
  assert.deepEqual(p.arrive, { interval: 4 });
  assert.equal(palabra(units, 75, 'stay home').example, 'We just stayed home and took a staycation.');
  assert.deepEqual(p['stay home'], { interval: 5 });
  assert.ok(palabra(units, 77, 'give someone a hand'));
  assert.deepEqual(p['give someone a hand'], { interval: 9 }, 'queda el de intervalo más largo');
  assert.ok(palabra(units, 77, 'No kidding!'));
  assert.ok(palabra(units, 78, 'get on'));
  assert.ok(palabra(units, 81, 'be in the mood for') && palabra(units, 81, 'get bumped from'));
  assert.ok(palabra(units, 83, 'drive someone crazy'));
  assert.deepEqual(p.perks, { interval: 7 }, 'perk (p. 83) se unió con perks (p. 82)');
  for (const [n, vieja] of [[82, 'end of the world'], [82, 'an aisle seat'], [83, 'the ticket'], [83, 'compensates'], [83, 'a bus'], [83, 'perk']]) {
    assert.equal(palabra(units, n, vieja), undefined, vieja);
  }
  const claves = todas(units).map(v => f.vocabKey(v.word));
  assert.equal(new Set(claves).size, claves.length, 'ninguna tarjeta repetida en la unidad');
});

test('el lote de phrasal verbs pierde las copias que ya están en su página', () => {
  const units = corregida();
  const pv = units.a2_7.batches.find(b => b.id === 'pv_a2_7');
  assert.deepEqual(pv.vocab.map(v => v.word), ['find out', 'take it easy']);
  assert.equal(pv.vocab.find(v => v.word === 'take it easy').type, 'phrase', 'no es un phrasal verb');
  assert.equal(pv.vocab.find(v => v.word === 'find out').type, 'phrasal verb');
  assert.equal(pv.title, 'Phrasal verbs & expressions — Unit 7');
  // Sin la página, la copia del lote se queda.
  const solo = { a2_7: { batches: [{ id: 'pv_a2_7', vocab: [w('go away', 'x', { type: 'phrasal verb' })] }] } };
  f.fixU7Phrasal(solo);
  assert.deepEqual(solo.a2_7.batches[0].vocab.map(v => v.word), ['go away']);
});

test('los temas repetidos solo se quitan si está la página que los enseña', () => {
  const units = unidad();
  units.a2_7.batches = units.a2_7.batches.filter(b => b.id !== f.u7Lote(76));
  f.fixU7P77(units);
  assert.deepEqual(pagina(units, 77).grammar.map(g => g.title), ["Past Simple with 'was' and 'were'", 'How long questions with Past Simple']);
  // Sin la p. 78, "arriving" queda en la p. 73 en forma base.
  units.a2_7.batches = units.a2_7.batches.filter(b => b.id !== f.u7Lote(78));
  f.fixU7P73(units);
  assert.ok(palabra(units, 73, 'arrive'));
});

test('números de página; correrlo otra vez no cambia nada; sin la página, false', () => {
  const units = corregida();
  for (const n of PAGINAS) assert.deepEqual(pagina(units, n).pages, [n]);
  const una = JSON.stringify(units);
  f.fixU7Pages(units);
  for (const n of PAGINAS) f[`fixU7P${n}`](units);
  f.fixU7Phrasal(units);
  assert.equal(JSON.stringify(units), una);
  const vacia = { a2_7: { batches: [] } };
  for (const n of PAGINAS) assert.equal(f[`fixU7P${n}`](vacia), false);
  // Un número que él puso a mano no se toca.
  const propia = unidad();
  pagina(propia, 73).pages = [72];
  f.fixU7Pages(propia);
  assert.deepEqual(pagina(propia, 73).pages, [72]);
});

// ── Preguntas ─────────────────────────────────────────────────────────────

test('cada página recibe sus preguntas, sin repetir ninguna', () => {
  const units = corregida();
  for (const n of PAGINAS) assert.equal(f[`addU7P${n}Questions`](units), true, `p. ${n}`);
  for (const n of PAGINAS) {
    const q = pagina(units, n).vocab.filter(v => v.type === 'question');
    assert.ok(q.length >= 2, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  const r = q => todas(units).find(v => v.word === q).example;
  assert.equal(r('What kinds of vacations do you like?'), 'I like relaxing vacations.');
  assert.equal(r("How long did Claire's trip to the mountains take?"), 'It took four hours.');
  assert.equal(r('Did you go away?'), 'As a matter of fact, no. We just stayed home and took a staycation.');
  const claves = todas(units).map(v => f.vocabKey(v.word));
  assert.equal(new Set(claves).size, claves.length);
  const una = JSON.stringify(units);
  for (const n of PAGINAS) f[`addU7P${n}Questions`](units);
  assert.equal(JSON.stringify(units), una);
});

test('el arranque y la restauración las corren, el lote de phrasal verbs después de las páginas', () => {
  const migrar = h.extraerFuncion('migrateState');
  const aplicar = h.extraerFuncion('applyPageFixes');
  assert.match(migrar, /if \(!merged\._u7PagesV1 && fixU7Pages\(merged\.units\)\) merged\._u7PagesV1 = true;/);
  for (const n of PAGINAS) {
    assert.match(migrar, new RegExp(`\\['_u7P${n}V1', fixU7P${n}\\]`));
    assert.match(migrar, new RegExp(`\\['_u7P${n}QV1', addU7P${n}Questions\\]`));
    assert.match(aplicar, new RegExp(`\\bfixU7P${n}\\b`));
    assert.match(aplicar, new RegExp(`\\baddU7P${n}Questions\\b`));
  }
  assert.ok(migrar.indexOf('fixU7Pages(') < migrar.indexOf('fixU7P73]'));
  assert.ok(migrar.indexOf('fixU7P83]') < migrar.indexOf('fixU7Phrasal]'));
  assert.ok(aplicar.indexOf('fixU7P83,') < aplicar.indexOf('fixU7Phrasal'));
});
