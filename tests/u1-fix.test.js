/**
 * La Unit 1, revisada contra sus fotos (su respaldo del 2 de octubre). Se
 * analizó en julio, antes de las reglas de "las opciones no son hechos",
 * "forma base" y "trampa en español", y salieron cosas falsas:
 *
 * - p. 11: CONFIRM CONTENT pide marcar T / F / NI, y "Mispronouncing a sound is
 *   never a problem" y "Only a small number… are non-native speakers" (las dos
 *   falsas) quedaron de ejemplo. UNDERSTAND FROM CONTEXT imprime las
 *   definiciones en desorden y salió accent = "the characteristic stress
 *   pattern of sentences" (es rhythm).
 * - p. 8: "Gloria is an engineer" era una opción de LISTEN FOR DETAILS.
 * - pp. 6-7: "hometown" como "ciudad natal", y el libro dice lo contrario.
 * - p. 3: "Nice to meet you, Mr. and Mrs. Jin-soo Park" (se lo dice a los Teller).
 *
 * Él pidió corregir todo y quitar las tarjetas de nombres propios.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'hayLote',
  'fixGrammarTopic', 'u1Lote', ...Array.from({ length: 11 }, (_, i) => `fixU1P${i + 1}`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const lote = (n, extra) => ({ id: f.u1Lote(n), pages: [n], vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...extra });
const pagina = (units, n) => units.a2_1.batches.find(b => b.id === f.u1Lote(n));
const palabra = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  3: `Marty: Excuse me. Are you on the nine o'clock tour? Jin-soo: Yes, we are. You too? Marty: We are. By the way,
    I'm Marty Teller. And this is my wife, Ana . . . and our daughter, Catherine. Jin-soo: And I'm Jin-soo Park. Nice
    to meet you, Mr. and Mrs. Teller . . . Catherine. Ana: Well, I'm originally from Ecuador, but Marty's from the
    States. We live in Dallas. Guy: Good morning, everyone. I'm Guy from Paris City Tours. Does everyone here speak
    English? Sunny: Yes, we do. Last / Family Name Park First / Given Name Mi-sun`,
  7: `3 A: ___ Janet's title Mrs.? B: I don't know. ___ she married? A: Yes, I think she ___ .`,
  8: `1 Jason wants to be a doctor. He's studying ___ in Miami. 2 My wife is great with numbers. She's a professor of
    ___ at a technical university. 4 I'm really good with computers. I want a career in ___ . architecture business
    engineering information technology mathematics / math medicine psychology. Interview 1 1 Gloria's hometown is
    2 Gloria is a a manager b an engineer c an architect. 2 Louie needs English for his a studies and travel.
    2 Adriana needs English for her a studies.`,
  // El artículo empieza en la p. 10 y sus ejercicios están en la p. 11.
  11: `Approximately 80% of the world's English speakers are not native speakers. 2 Only a small number of the English
    speakers in the world are non-native speakers of the language. a the characteristic stress pattern of sentences
    b the particular way you pronounce sounds and words c the rising or falling of the voice. 1 accent 2 rhythm
    3 intonation. writing what I hear and then repeat it. Repeating what you hear helps you pronounce words in English.`,
};

/** Las palabras de una frase nueva tienen que estar impresas (con plural, -s o -ing). */
function estaImpresa(frase, n) {
  const impresas = new Set(IMPRESO[n].toLowerCase().replace(/'s\b/g, ' is').match(/[a-z0-9%'-]+/g));
  const forma = p => [p, p.replace(/s$/, ''), p.replace(/ing$/, ''), `${p}s`, `${p}ing`, `${p.replace(/e$/, '')}ing`];
  for (const p of frase.toLowerCase().replace(/'s\b/g, ' is').match(/[a-z0-9%'-]+/g)) {
    assert.ok(forma(p).some(x => impresas.has(x)), `"${p}" (de "${frase}") no está impreso en la p. ${n}`);
  }
}

// ── Una unidad con lo que salió del análisis, en lo que se corrige ────────

function unidad() {
  return { a2_1: {
    fcProgress: { communicating: { interval: 6 }, communicate: { interval: 2 }, enjoys: { interval: 3 },
                  helps: { interval: 9 }, helping: { interval: 1 }, mispronouncing: { interval: 4 }, Dallas: { interval: 1 } },
    batches: [
      lote(1, { vocab: [
        w('communicate', 'I want to communicate with people who don\'t speak my language.'),
        w('discuss', 'Discuss the importance of English in your life.', { translation: 'discutir, hablar de' }),
        w('learning', 'Discuss some difficulties of learning a language.'),
        w('get acquainted', 'Get acquainted with someone.'),
        w('use', 'I want to use English in my work.'), w('study', 'I want to study in another country.'),
      ] }),
      lote(2, { vocab: [w('communicating', "It's useful for communicating with visitors to my country.")] }),
      lote(3, {
        vocab: [
          w('acquainted', 'Read and listen to tourists getting acquainted before a tour.'),
          w('by the way', "We are. By the way, I'm Marty Tellier."),
          w('Dallas', "I'm from Dallas, Texas, and we live in Dallas."),
          w('Paris City Tours', "I'm Guy from Paris City Tours."), w('Seoul, South Korea', "We're from Seoul, South Korea."),
          w('Nice to meet you', 'Nice to meet you, Mr. and Mrs. Jin-soo Park.'),
          w('we live in', "I'm from Dallas, Texas, and we live in Dallas."),
          w('First / Given Name', 'First / Given Name: Mi-run'),
          w('Yes, we do', 'Yes, we do.', { translation: 'Sí, lo hacemos' }),
        ],
        grammar: [
          { title: "Polite greetings: 'It's a pleasure to meet you'",
            examples: [{ en: 'Nice to meet you, Mr. and Mrs. Jin-soo Park.', es: 'Mucho gusto, Sr. y Sra. Jin-soo Park.' }] },
          { title: "Starting conversations: 'Excuse me'", examples: [
            { en: "Excuse me. Are you on the nine o'clock tour?", es: 'Disculpe. ¿Estás en el tour de las nueve?' },
            { en: 'Excuse me. Nice to meet you.', es: 'Disculpe. Mucho gusto.' }] },
        ],
        exercises: [{ type: 'fill_blank', question: 'Nice to ___ you, Mr. and Mrs. Park.', answer: 'meet' }],
      }),
      lote(4, {
        grammar: [
          { title: 'Information questions with be',
            spanishTrap: "En español se puede decir '¿Quién tu profesor es?' pero en inglés el verbo be SIEMPRE va después de la palabra interrogativa: 'Who is your teacher?' El orden sujeto-verbo del español no funciona aquí.",
            commonErrors: [{ wrong: 'Where is from your teacher?', correct: 'Where is your teacher from?', why: "'From' goes at the end when asking about origin" }] },
          { title: 'Contractions with be', commonErrors: [
            { wrong: 'Its hot and sunny.', correct: "It's hot and sunny." },
            { wrong: 'Where is your teacher from?', correct: "Where's your teacher from?", why: 'In spoken and informal English, we typically use contractions' }] },
        ],
        exercises: [
          { type: 'multiple_choice', question: 'Which contraction is INCORRECT?', answer: "Who're = Who are" },
          { type: 'error_correction', question: 'Find and correct the mistake: Where your teacher is from?', answer: 'Where is your teacher from?' },
        ],
      }),
      lote(5, {
        vocab: [w('same here', 'Same here! So where are you from?', { translation: 'igual aquí, lo mismo digo' })],
        grammar: [{ title: 'Contractions of the verb be' }, { title: 'Information questions with be for a partner' },
                  { title: "Using 'Same here' to express agreement" }, { title: "Introductions with 'Let me introduce you to'" }],
        exercises: [
          { type: 'fill_blank', question: 'Complete: ___ to meet you! She is from Pakistan.', answer: 'Pleasure' },
          { type: 'fill_blank', question: 'Complete the sentence: I ___ not sure. I think he is about twenty-five.', answer: "'m" },
        ],
        speakingPrompts: ['Now practice the conversations from Exercise E.', 'Let me introduce you to Mark.'],
      }),
      lote(6, {
        vocab: [w('hometown', "I live in Toronto. That's my hometown now.", { translation: 'ciudad natal' })],
        grammar: [{ title: "Yes/No questions with 'be' and short answers" }, { title: "Contractions with 'be' in questions and negatives" }],
        exercises: [{ type: 'matching', question: 'Match each word with its translation', options: ['birthplace → lugar de nacimiento', 'hometown → ciudad natal'] }],
        speakingPrompts: ['Get acquainted with a classmate.', "What's your birthplace?"],
      }),
      lote(7, {
        vocab: [w('title', "What's Janet's title Mrs.?", { translation: 'título' })],
        grammar: [{ title: 'Information Questions with be (What, Where)' }, { title: 'Yes/No Questions with be' },
          { title: 'Responding with Interest - Social Language', commonErrors: [
            { wrong: 'How interesting!', correct: 'Interesting!' }, { wrong: 'Very wow!', correct: 'Wow!' }] }],
        exercises: [
          { type: 'multiple_choice', question: 'Which is the correct response to show interest?', answer: 'Interesting!',
            options: ['How interesting!', 'Very wow!', 'Interesting!', 'Much great!'] },
          { type: 'error_correction', question: 'Find and correct the mistake: She is married? Yes, I think.', answer: 'Is she married? Yes, I think.' },
        ],
      }),
      lote(8, {
        vocab: [
          w('engineer', 'Gloria is an engineer.'), w('studies', 'Louie needs English for his studies and travel.'),
          w('mathematics', 'My wife is great with numbers.'), w('medicine', 'Jason wants to be a doctor.'),
          w('information technology', "He's working in information technology right now."),
          w('enjoys', 'Miranda enjoys talking to people when they have problems.'),
          w('helping', 'Miranda enjoys helping them find solutions.'),
        ],
        exercises: [{ type: 'fill_blank', question: 'Louie needs English for his ___ and travel. Adriana needs English for her studies.', answer: 'studies' }],
        speakingPrompts: ['Discuss the importance of English in your life.'],
      }),
      lote(9, { grammar: [{ title: 'Frequency adverbs: sometimes, often, all the time' }, { title: 'Prepositions with places: at, in, with' }] }),
      lote(10, {
        vocab: [w('stress', 'I practice sounds, intonation, rhythm, and stress.'),
          w('stressing', 'English has a characteristic rhythm that comes from stressing some words.'),
          w('mispronounces', 'We know that if a speaker mispronounces certain vowel sounds, it may cause a problem.'),
          w('helps', 'When you stress the correct words and syllables, it helps people understand you.'),
          w('repeat', 'And repeat what you hear those people say—quietly, to yourself of course!',
            { exampleTranslation: 'Y repite lo que escuchas que esa gente dice—silenciosamente, para ti mismo, ¡por supuesto!' })],
        grammar: [{ title: 'Imperative for giving advice and instructions', commonErrors: [
          { wrong: 'You practice sounds every day.', correct: 'Practice sounds every day.' },
          { wrong: 'To improve your accent, listens to native speakers.', correct: 'To improve your accent, listen to native speakers.' }] }],
      }),
      lote(11, {
        vocab: [
          w('mispronouncing', 'Mispronouncing a sound is never a problem.'),
          w('non-native speakers', 'Only a small number of the English speakers in the world are non-native speakers of the language.'),
          w('stress pattern', 'The accent is the characteristic stress pattern of sentences.'),
          w('particular', 'Rhythm is the particular way you pronounce sounds and words.'),
          w('writing', 'Writing what I hear and then I repeat it is a way to practice.'),
          w('using', 'Using English language apps on my phone helps me practice.'),
        ],
        grammar: [{ title: 'Present Continuous for ongoing actions' }, { title: 'Gerunds (-ing forms) as subjects and objects' }],
        exercises: [
          { type: 'matching', question: 'Match each word with its meaning:', answer: 'all', options: [
            'accent → the characteristic stress pattern of sentences', 'rhythm → the particular way you pronounce sounds and words',
            'intonation → the rising or falling of the voice'] },
          { type: 'multiple_choice', question: 'According to the page, which statement is TRUE?', answer: 'Mispronouncing a sound is never a problem',
            options: ['Mispronouncing a sound is never a problem', 'All English speakers are native speakers'] },
          { type: 'multiple_choice', question: 'Which statement is FALSE according to the article?',
            answer: 'Only a small number of English speakers are non-native speakers',
            options: ['Mispronouncing a sound is never a problem', 'Only a small number of English speakers are non-native speakers'] },
          { type: 'fill_blank', question: 'English ___ is difficult. It refers to the characteristic stress pattern of sentences.', answer: 'accent' },
        ],
      }),
    ],
  } };
}

function corregida() {
  const units = unidad();
  for (let n = 1; n <= 11; n++) assert.equal(f[`fixU1P${n}`](units), true, `p. ${n}`);
  return units;
}

// ── Lo grave: lo que enseñaba algo falso ──────────────────────────────────

test('p. 11: ni las afirmaciones falsas ni las parejas cruzadas quedan como hechos', () => {
  const units = corregida();
  const p = pagina(units, 11);
  assert.equal(palabra(units, 11, 'non-native speakers').example, 'Approximately 80% of the English speakers in the world are non-native speakers.');
  assert.equal(palabra(units, 11, 'stress pattern').example, 'Rhythm is the characteristic stress pattern of sentences.');
  assert.equal(palabra(units, 11, 'particular').example, 'Accent is the particular way you pronounce sounds and words.');
  for (const v of p.vocab) assert.doesNotMatch(v.example, /never a problem|Only a small number/, v.word);
  assert.deepEqual(p.exercises[0].options.slice(0, 2), ['accent → the particular way you pronounce sounds and words',
    'rhythm → the characteristic stress pattern of sentences']);
  const verdadera = p.exercises.find(e => e.question === 'According to the page, which statement is TRUE?');
  assert.equal(verdadera.answer, 'French speakers often find the th sound difficult');
  assert.ok(verdadera.options.includes(verdadera.answer));
  const falsa = p.exercises.find(e => e.question === 'Which statement is FALSE according to the article?');
  assert.ok(!falsa.options.includes('Mispronouncing a sound is never a problem'), 'una sola falsa entre las opciones');
  assert.ok(falsa.options.includes(falsa.answer));
  const ritmo = p.exercises.find(e => e.answer === 'Rhythm');
  assert.equal(ritmo.question, '___ is the characteristic stress pattern of sentences.');
  assert.deepEqual(p.grammar.map(g => g.title), ['Gerunds (-ing forms) as subjects and objects'], 'el presente continuo sin presente continuo, fuera');
});

test('p. 8: las opciones del audio ya no son hechos, y cada ejemplo tiene su palabra', () => {
  const units = corregida();
  assert.equal(palabra(units, 8, 'engineer').example, 'Is Gloria an engineer?');
  assert.equal(palabra(units, 8, 'studies').example, 'I need English for my studies.');
  assert.match(palabra(units, 8, 'mathematics').example, /professor of mathematics/);
  assert.match(palabra(units, 8, 'medicine').example, /studying medicine in Miami/);
  assert.match(palabra(units, 8, 'information technology').example, /a career in information technology\.$/);
  assert.deepEqual(pagina(units, 8).exercises, [], 'el ejercicio de Louie salía de una opción');
  assert.deepEqual(pagina(units, 8).speakingPrompts, [], 'el título de la lección no es una tarea');
});

test('pp. 6 y 7: hometown es donde vive ahora, como dice el libro', () => {
  const units = corregida();
  assert.equal(palabra(units, 6, 'hometown').translation, 'tu ciudad (donde vives ahora)');
  assert.equal(palabra(units, 6, 'hometown').exampleTranslation, 'Vivo en Toronto. Esa es mi ciudad ahora.');
  assert.deepEqual(pagina(units, 6).exercises[0].options, ['birthplace → lugar de nacimiento', 'hometown → ciudad donde vives']);
  assert.doesNotMatch(JSON.stringify(units), /ciudad natal/);
});

test('p. 3: Jin-soo saluda a los Teller; Teller y Mi-sun bien escritos; sin nombres propios', () => {
  const units = corregida();
  assert.equal(palabra(units, 3, 'Nice to meet you').example, 'Nice to meet you, Mr. and Mrs. Teller.');
  assert.equal(palabra(units, 3, 'by the way').example, "We are. By the way, I'm Marty Teller.");
  assert.equal(palabra(units, 3, 'First / Given Name').example, 'First / Given Name: Mi-sun');
  assert.equal(palabra(units, 3, 'we live in').example, 'We live in Dallas.');
  assert.equal(palabra(units, 3, 'Yes, we do').example, 'Does everyone here speak English? Yes, we do.');
  for (const nombre of ['Dallas', 'Paris City Tours', 'Seoul, South Korea', 'acquainted']) assert.equal(palabra(units, 3, nombre), undefined, nombre);
  const p = pagina(units, 3);
  assert.equal(p.grammar[0].examples[0].en, 'Nice to meet you, Mr. and Mrs. Teller.');
  assert.equal(p.exercises[0].question, 'Nice to ___ you, Mr. and Mrs. Teller.');
  assert.deepEqual(p.grammar[1].examples.map(e => e.en), ["Excuse me. Are you on the nine o'clock tour?"]);
  assert.doesNotMatch(JSON.stringify(p), /Jin-soo Park|Tellier|Mi-run/);
});

test('los ejemplos nuevos están impresos en la página', () => {
  const units = corregida();
  const nuevos = [[3, 'Nice to meet you'], [3, 'by the way'], [3, 'we live in'], [3, 'Yes, we do'], [7, 'title'],
    [8, 'engineer'], [8, 'mathematics'], [8, 'medicine'], [8, 'information technology'],
    [11, 'non-native speakers'], [11, 'stress pattern'], [11, 'particular'], [11, 'write']];
  for (const [n, word] of nuevos) estaImpresa(palabra(units, n, word).example.replace(/^First \/ Given Name: /, ''), n);
});

// ── Gramática que daba por error lo que está bien ─────────────────────────

test('pp. 4, 7 y 10: lo correcto ya no sale como error', () => {
  const units = corregida();
  const errores = (n, t) => pagina(units, n).grammar.find(g => g.title === t).commonErrors.map(e => e.wrong);
  assert.deepEqual(errores(4, 'Contractions with be'), ['Its hot and sunny.', 'Whats your email address?']);
  assert.deepEqual(errores(7, 'Responding with Interest - Social Language'), ['What interesting!', 'Very wow!']);
  assert.deepEqual(errores(10, 'Imperative for giving advice and instructions'), ['To improve your accent, listens to native speakers.']);
  assert.match(pagina(units, 4).grammar[0].spanishTrap, /'How old is Melanie\?'/);
  assert.doesNotMatch(pagina(units, 4).grammar[0].spanishTrap, /Quién tu profesor es/);
  assert.equal(pagina(units, 4).exercises.length, 1, '"Who\'re" existe: fuera el ejercicio');
  const interes = pagina(units, 7).exercises.find(e => e.question === 'Which is the correct response to show interest?');
  assert.deepEqual(interes.options, ['What interesting!', 'Very wow!', 'Interesting!', 'Much great!']);
  assert.equal(pagina(units, 7).exercises[1].answer, 'Is she married? Yes, I think she is.');
});

test('los temas repetidos quedan en una sola página', () => {
  const units = corregida();
  assert.deepEqual(pagina(units, 5).grammar.map(g => g.title), ["Using 'Same here' to express agreement"]);
  assert.deepEqual(pagina(units, 6).grammar.map(g => g.title), ["Yes/No questions with 'be' and short answers"]);
  assert.deepEqual(pagina(units, 7).grammar.map(g => g.title), ['Responding with Interest - Social Language']);
  assert.deepEqual(pagina(units, 9).grammar.map(g => g.title), ['Frequency adverbs: sometimes, often, all the time']);
});

test('sin la página que enseña el tema, el repetido no se quita', () => {
  const units = unidad();
  units.a2_1.batches = units.a2_1.batches.filter(b => ![f.u1Lote(3), f.u1Lote(4), f.u1Lote(6), f.u1Lote(8)].includes(b.id));
  f.fixU1P5(units); f.fixU1P7(units); f.fixU1P9(units);
  assert.equal(pagina(units, 5).grammar.length, 4);
  assert.equal(pagina(units, 7).grammar.length, 3);
  assert.equal(pagina(units, 9).grammar.length, 2);
});

test('p. 5: "same here" es "igualmente"; los ejercicios siguen una sola conversación', () => {
  const units = corregida();
  assert.equal(palabra(units, 5, 'same here').translation, 'igualmente, lo mismo digo');
  const p = pagina(units, 5);
  assert.equal(p.exercises[0].question, "Lisa, I'd like you to meet Mark. ___ to meet you, Mark!");
  assert.deepEqual([p.exercises[1].question, p.exercises[1].answer], ["Complete the sentence: ___ not sure. I think he's about twenty-five.", "I'm"]);
  assert.deepEqual(p.speakingPrompts, ['Now practice the conversations from Exercise E.'], 'la frase del modelo no es una tarea');
  assert.deepEqual(pagina(units, 6).speakingPrompts, ['Get acquainted with a classmate.']);
});

test('p. 1: discuss es "hablar de", no "discutir"', () => {
  const units = corregida();
  assert.equal(palabra(units, 1, 'discuss').translation, 'hablar de, conversar sobre');
  assert.equal(palabra(units, 1, 'learn').translation, 'aprender');
  assert.equal(palabra(units, 7, 'title').example, "Is Janet's title Mrs.?");
});

// ── Tarjetas: forma base, repetidas unidas, progreso que no se pierde ─────

test('los verbos quedan en forma base, y las repetidas se unen sin perder progreso', () => {
  const units = corregida();
  const fp = units.a2_1.fcProgress;
  assert.equal(palabra(units, 2, 'communicating'), undefined);
  assert.deepEqual(fp.communicate, { interval: 6 }, 'gana el progreso más largo');
  assert.equal(fp.communicating, undefined);
  assert.deepEqual([palabra(units, 8, 'enjoy').translation, fp.enjoy], ['disfrutar', { interval: 3 }]);
  assert.ok(palabra(units, 8, 'help'));
  assert.equal(palabra(units, 10, 'helps'), undefined, '"helps" se une con "help" de la p. 8');
  assert.deepEqual(fp.help, { interval: 9 });
  assert.equal(palabra(units, 10, 'stressing'), undefined);
  assert.ok(palabra(units, 10, 'mispronounce'));
  assert.equal(palabra(units, 11, 'mispronouncing'), undefined);
  assert.deepEqual(fp.mispronounce, { interval: 4 });
  assert.equal(palabra(units, 11, 'using'), undefined, 'ya está "use" en la p. 1');
  assert.equal(palabra(units, 11, 'write').example, 'Write what you hear and then repeat it.');
  assert.equal(palabra(units, 10, 'repeat').exampleTranslation, 'Y repite lo que le oyes decir a esa gente, en voz baja, ¡para ti mismo, claro!');
  assert.equal(palabra(units, 1, 'get acquainted').translation, 'conocerse, llegar a conocer a alguien');
  const todas = units.a2_1.batches.flatMap(b => b.vocab.map(v => v.word.toLowerCase()));
  assert.equal(new Set(todas).size, todas.length, 'ninguna tarjeta repetida en la unidad');
});

test('sin las pp. 8 y 10, las de la p. 11 y la p. 10 quedan en forma base igual', () => {
  const units = unidad();
  units.a2_1.batches = units.a2_1.batches.filter(b => ![f.u1Lote(8), f.u1Lote(10)].includes(b.id));
  f.fixU1P11(units);
  const m = palabra(units, 11, 'mispronounce');
  assert.equal(m.example, 'If a speaker mispronounces certain vowel sounds, it may cause a problem.', 'y sin el ejemplo falso');
  const sin8 = unidad();
  sin8.a2_1.batches = sin8.a2_1.batches.filter(b => b.id !== f.u1Lote(8));
  f.fixU1P10(sin8);
  assert.equal(palabra(sin8, 10, 'help').translation, 'ayudar');
});

test('lo que él editó no se toca; sin la página, no marca la bandera', () => {
  const units = unidad();
  palabra(units, 6, 'hometown').translation = 'mi ciudad';
  palabra(units, 8, 'engineer').example = 'My brother is an engineer.';
  f.fixU1P6(units); f.fixU1P8(units);
  assert.equal(palabra(units, 6, 'hometown').translation, 'tu ciudad (donde vives ahora)', 'la traducción estaba mal: se corrige');
  assert.equal(palabra(units, 8, 'engineer').example, 'My brother is an engineer.');
  for (let n = 1; n <= 11; n++) {
    assert.equal(f[`fixU1P${n}`]({ a2_1: { batches: [] } }), false, `p. ${n}`);
    assert.equal(f[`fixU1P${n}`]({}), false, `p. ${n}`);
  }
});

test('correr las correcciones otra vez no cambia nada', () => {
  const units = corregida();
  const una = JSON.stringify(units);
  for (let n = 1; n <= 11; n++) f[`fixU1P${n}`](units);
  assert.equal(JSON.stringify(units), una);
});

test('el arranque y la restauración de páginas las corren, después de numerar la unidad', () => {
  const migrar = h.extraerFuncion('migrateState');
  const restaurar = h.extraerFuncion('applyPageFixes');
  for (let n = 1; n <= 11; n++) {
    assert.match(migrar, new RegExp(`if \\(!merged\\._u1P${n}V1 && fixU1P${n}\\(merged\\.units\\)\\) merged\\._u1P${n}V1 = true;`));
    assert.match(restaurar, new RegExp(`\\bfixU1P${n}\\b`));
  }
  // La p. 10 une "helps" con "help", que crea la p. 8; la p. 11 une con la p. 10.
  assert.ok(migrar.indexOf('fixU1P8(') < migrar.indexOf('fixU1P10(') && migrar.indexOf('fixU1P10(') < migrar.indexOf('fixU1P11('));
  assert.ok(restaurar.indexOf('fixU1P8,') < restaurar.indexOf('fixU1P10,'));
});

test('los ids de la unidad no son una constante del arranque', () => {
  // Una constante declarada después de `let state = loadState()` lanza
  // ReferenceError en migrateState: es lo que borró sus datos.
  assert.doesNotMatch(h.fuente(), /^const U1\b/m);
  assert.equal(f.u1Lote(1), 'b_1784933801961_jg41en');
  assert.equal(f.u1Lote(11), 'b_1784935498127_j4a5jm');
});
