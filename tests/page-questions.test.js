/**
 * Preguntas para el roleplay, por página.
 *
 * Él es flojo para preguntar y pidió, en cada página, las preguntas que le
 * pueden hacer o que puede hacer en un roleplay: del tema del libro (no de sus
 * textos), abiertas más las de sí o no que el roleplay usa. Primero se hicieron
 * en un mazo aparte (pp. 109-113); él las quería DENTRO de las flashcards, con
 * su repaso, para aprenderse la estructura de cada pregunta, y que salieran
 * solas al subir la foto de una página. Ahora son tarjetas de la página (type
 * "question"): al frente la pregunta; atrás qué significa y una respuesta.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();
const PAGINAS = ['addU10P109Questions', 'addU10P110Questions', 'addU10P111Questions', 'addU10P112Questions', 'addU10P113Questions',
  'addU2P13Questions', 'addU2P14Questions'];
const NOMBRES = ['vocabKey', 'questionCard', 'addQuestionCards', 'addPageQuestions', 'moveQuestionsToCards', 'wordKind', 'pageCardsLabel', 'fcWordClass', ...PAGINAS];
const f = h.ejecutar(`const PHRASAL_PARTICLES = new Set(['up']);
  ${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const preguntas = b => (b.vocab || []).filter(v => v.type === 'question');
const unidad = () => ({ a2_10: { batches: [{ id: 'p109', pages: [109], vocab: [{ word: 'life goal' }] }] } });

test('la p. 109 recibe sus preguntas como tarjetas, después de sus palabras', () => {
  const units = unidad();
  assert.equal(f.addU10P109Questions(units), true);
  const b = units.a2_10.batches[0];
  assert.equal(b.vocab[0].word, 'life goal', 'las palabras quedan primero, igual que estaban');
  assert.ok(preguntas(b).length >= 5);
  assert.equal(b.questions, undefined, 'ya no hay mazo aparte');
  for (const x of preguntas(b)) {
    assert.match(x.word, /\?$/, `"${x.word}" no es pregunta`);
    assert.ok(x.translation && x.example, `"${x.word}" sin traducción o sin respuesta de ejemplo`);
    assert.equal(x.emoji, '❓');
  }
});

test('casi todas abiertas, del tema de la página', () => {
  const units = unidad();
  f.addU10P109Questions(units);
  const qs = preguntas(units.a2_10.batches[0]).map(x => x.word);
  const abiertas = qs.filter(q => /^(What|Which|Why|How|Where|When|Who)\b/.test(q));
  assert.ok(abiertas.length >= qs.length - 2, 'las de sí o no son pocas');
  assert.ok(qs[0].startsWith('Which of the three life goals do you find the most appealing?'), 'la primera es la del Warm-Up');
  assert.ok(qs.every(q => /life goal|goal|kids|money|healthy life/.test(q)), 'todas del tema de la página');
});

test('correrla otra vez no repite tarjetas; sin la página, nada', () => {
  const units = unidad();
  f.addU10P109Questions(units);
  const una = JSON.stringify(units);
  f.addU10P109Questions(units);
  assert.equal(JSON.stringify(units), una);
  assert.equal(f.addU10P109Questions({ a2_10: { batches: [] } }), false);
});

test('una pregunta que la unidad ya tiene como tarjeta no se repite', () => {
  // "What do you mean?" es también una expresión del vocabulario de la p. 113.
  const units = { a2_10: { batches: [{ id: 'b', pages: [113], vocab: [{ word: 'What do you mean?', type: 'phrase' }] }] } };
  f.addU10P113Questions(units);
  const b = units.a2_10.batches[0];
  assert.equal(b.vocab.filter(v => f.vocabKey(v.word) === 'what do you mean').length, 1);
  assert.equal(b.vocab[0].type, 'phrase', 'la que ya estaba (con su progreso) queda');
});

test('las del mazo aparte pasan a las flashcards, sin repetir', () => {
  const units = { a2_10: { batches: [{ id: 'a', pages: [112], vocab: [{ word: 'graduate' }],
    questions: [{ q: 'When would you like to graduate?', es: '¿Cuándo te gustaría graduarte?', a: 'Next year.' }] }] } };
  assert.equal(f.moveQuestionsToCards(units), true);
  const b = units.a2_10.batches[0];
  assert.equal(b.questions, undefined);
  assert.deepEqual(b.vocab[1], { word: 'When would you like to graduate?', translation: '¿Cuándo te gustaría graduarte?',
    phonetic: '', type: 'question', emoji: '❓', example: 'Next year.', exampleTranslation: '', difficulty: 'medium' });
  // Un aparato con la versión vieja vuelve a subir la página con b.questions.
  b.questions = [{ q: 'When would you like to graduate?', es: '¿Cuándo te gustaría graduarte?', a: 'Next year.' }];
  assert.equal(f.moveQuestionsToCards(units), false);
  assert.equal(b.vocab.length, 2);
  assert.equal(b.questions, undefined);
});

test('pp. 110 a 113: sus preguntas, del tema de cada página', () => {
  const units = { a2_10: { batches: [110, 111, 112, 113].map(p => ({ id: 'p' + p, pages: [p], vocab: [] })) } };
  ['addU10P110Questions', 'addU10P111Questions', 'addU10P112Questions', 'addU10P113Questions'].forEach(n => assert.equal(f[n](units), true));
  const [p110, p111, p112, p113] = units.a2_10.batches.map(b => preguntas(b).map(x => x.word));
  assert.equal(p110[0], 'What makes people successful?', 'la del título de la página');
  assert.ok(p111.some(q => /grab a bite/.test(q)) && p111.some(q => /call it a day/.test(q)), 'con las expresiones del diálogo');
  assert.ok(p112.every(q => /would/i.test(q)), 'todas con would');
  assert.ok(p112.includes('Who would like to get rich?'), 'Who como sujeto, sin "you"');
  assert.ok(p113.includes('What do you mean?'), 'la del Social language');
});

test('Unit 2, pp. 13 y 14: solo las principales, del tema de cada página', () => {
  // Se subieron antes de que el análisis hiciera las preguntas; él pidió solo
  // las principales.
  const units = { a2_2: { batches: [
    { id: 'p13', pages: [13], vocab: [{ word: 'prefer' }] },
    { id: 'p14', pages: [14], vocab: [{ word: "What's more your style?", type: 'phrase' }, { word: 'How about you?', type: 'phrase' }] },
  ] } };
  assert.equal(f.addU2P13Questions(units), true);
  assert.equal(f.addU2P14Questions(units), true);
  const [p13, p14] = units.a2_2.batches.map(b => preguntas(b));
  assert.ok(p13.length >= 2 && p13.length <= 4 && p14.length >= 2 && p14.length <= 5, 'pocas: las principales');
  assert.equal(p13[0].word, 'Which do you prefer? Rock concerts or soccer games?', 'la del Warm-Up, tal como está impresa');
  assert.ok(p13.every(x => /concert|soccer/.test(x.word)), 'del tema de la p. 13');
  assert.ok(p14.every(x => /style|opinion|entertainment|exhibit|game|concert/.test(x.word)), 'del tema de la p. 14');
  for (const x of [...p13, ...p14]) {
    assert.match(x.word, /\?$/, `"${x.word}" no es pregunta`);
    assert.ok(x.translation && x.example, `"${x.word}" sin traducción o sin respuesta de ejemplo`);
  }
  assert.equal(f.addU2P13Questions({ a2_2: { batches: [] } }), false, 'sin la página, nada');
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /if \(!merged\._u2P13QuestionsV1 && addU2P13Questions\(merged\.units\)\) merged\._u2P13QuestionsV1 = true;/);
  assert.match(migrar, /if \(!merged\._u2P14QuestionsV1 && addU2P14Questions\(merged\.units\)\) merged\._u2P14QuestionsV1 = true;/);
  assert.match(h.extraerFuncion('applyPageFixes'), /addU2P13Questions, addU2P14Questions/);
});

test('en la tarjeta: etiqueta "Question", letra que cabe, y la hoja las cuenta aparte', () => {
  assert.equal(f.wordKind({ type: 'question', word: 'What do you mean?' }).label, 'Question');
  assert.equal(f.fcWordClass('Which opinion do you agree with? Why?'), 'fc-word fc-word-long');
  assert.equal(f.fcWordClass('life goal'), 'fc-word');
  assert.equal(f.pageCardsLabel([{ word: 'a' }, { word: 'b' }, { word: 'Why?', type: 'question' }]), '2 words and 1 question');
  assert.equal(f.pageCardsLabel([{ word: 'a' }]), '1 word');
  const hoja = h.extraerFuncion('openPageSheet');
  assert.match(hoja, /Review these \$\{pageCardsLabel\(words\)\}/);
  assert.doesNotMatch(fuente, /practicePageQuestions/, 'el mazo aparte ya no existe');
});

test('el arranque y la restauración las pasan a las flashcards', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /if \(!merged\._u10P109QuestionsV1 && addU10P109Questions\(merged\.units\)\) merged\._u10P109QuestionsV1 = true;/);
  assert.match(migrar, /\n  moveQuestionsToCards\(merged\.units\);\n/);
  const restaurar = h.extraerFuncion('applyPageFixes');
  assert.match(restaurar, /addU10P112Questions, addU10P113Questions, moveQuestionsToCards/);
});

// ── Las que salen solas al subir una página ─────────────────────────────

/** AIService con _analyzeReal y su lector de JSON; la IA responde `json`. */
function analizar(json) {
  const ini = fuente.indexOf('  async _analyzeReal(');
  const fin = fuente.indexOf('  /* ── Main entry point', ini);
  assert.ok(ini > 0 && fin > ini, 'no se encontró _analyzeReal');
  const svc = h.ejecutar(`
    ${['sanitizeGrammar', 'vocabKey', 'questionCard'].map(n => h.extraerFuncion(n)).join('\n')}
    return { async _callClaude() { return ${JSON.stringify(JSON.stringify(json))}; },
    ${fuente.slice(ini, fin)} };`, {});
  return svc._analyzeReal({ images: ['data:image/jpeg;base64,AAAA'], level: 'a2', unitNum: 2 });
}

test('al analizar una página, sus preguntas entran como tarjetas', async () => {
  const r = await analizar({
    vocabulary: [{ word: 'a play', translation: 'una obra de teatro', type: 'noun' },
                 { word: 'How about you?', translation: '¿Y tú?', type: 'phrase' }],
    questions: [
      { q: "What's your opinion of each entertainment event?", es: '¿Qué opinas de cada evento?', a: 'I love plays.' },
      { q: 'How about you?', es: '¿Y tú?', a: 'Me? I prefer concerts.' },          // ya es vocabulario
      { q: 'Do you like plays', es: '¿Te gustan las obras?', a: 'Yes, I do.' },     // sin signo de pregunta
      { q: 'Which do you prefer?', es: '', a: 'Concerts.' },                         // sin traducción
      'Why?',                                                                        // no es un objeto
    ],
  });
  assert.equal(r.questions, undefined, 'no se guarda un mazo aparte');
  assert.deepEqual(r.vocabulary.map(v => v.word), ['a play', 'How about you?', "What's your opinion of each entertainment event?"]);
  const q = r.vocabulary[2];
  assert.equal(q.type, 'question');
  assert.equal(q.translation, '¿Qué opinas de cada evento?');
  assert.equal(q.example, 'I love plays.');
});

test('una página sin preguntas sigue funcionando', async () => {
  const r = await analizar({ vocabulary: [{ word: 'a talk', translation: 'una charla' }] });
  assert.deepEqual(r.vocabulary.map(v => v.word), ['a talk']);
});

test('el prompt pide las preguntas: primero las impresas, del tema del libro, sin rellenar', () => {
  const ini = fuente.indexOf('  async _analyzeReal(');
  const prompt = fuente.slice(ini, fuente.indexOf('  _parseClaudeJSON(raw) {', ini));
  assert.match(prompt, /"questions": \[\s*\{ "q": /);
  assert.match(prompt, /First the questions the page itself prints .* copied WORD FOR WORD/s);
  assert.match(prompt, /about the BOOK's topic — never about the student's life/);
  assert.match(prompt, /Mostly open questions \(What, Which, Why, How, Where, When, Who\)/);
  assert.match(prompt, /NEVER pad/);
});
