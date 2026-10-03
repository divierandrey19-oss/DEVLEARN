/**
 * La Unit 5, revisada contra sus fotos (pp. 49-59; su respaldo del 2 de
 * octubre). Una página por lote, sin foto ni número.
 *
 * - Él pidió quitar los platos con nombres raros (el menú de la p. 50 y la
 *   comida callejera de la p. 59): cada tarjeta se queda con la comida, sin el
 *   país ("Peruvian grilled fish" → "grilled fish"), y el progreso la sigue.
 * - "I'm a real meat and potatoes man" había salido "I'm a real treat".
 * - La gramática de some / any daba por error frases correctas ("We have
 *   apples", "Do you have some eggs?"); el libro dice que en preguntas da igual.
 * - Opciones del audio de la p. 57 como hechos; "Hot peppers contain a lot of
 *   salt"; "Traditional markets often have trucks".
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 11 }, (_, i) => 49 + i);
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'hayLote',
  'fixGrammarTopic', 'u5Lote', 'fixU5Pages', 'quitarTemaU5', ...PAGINAS.map(n => `fixU5P${n}`),
  'questionCard', 'addQuestionCards', 'addPageExtras', 'addU5Questions', ...PAGINAS.map(n => `addU5P${n}Questions`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const pagina = (units, n) => units.a2_5.batches.find(b => b.id === f.u5Lote(n));
const palabra = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);
const todas = units => units.a2_5.batches.flatMap(b => b.vocab || []);

function unidad() {
  const lotes = {
    50: { vocab: [w('Peruvian grilled fish', 'Peruvian grilled fish is delicious.'), w('Brazilian cheese bread', 'Brazilian cheese bread is delicious.'),
                  w('French Canadian yellow split pea soup', 'French Canadian yellow split pea soup is a soup.'), w('Russian salad', 'Russian salad is a popular dish.')],
          grammar: [{ title: 'Food nouns with modifiers (nationality + food type)' }] },
    51: { vocab: [w('grilled fish', 'And then for my main course, I\'ll have the grilled fish.'), w('real treat', "I'm a real treat.", { translation: 'verdadero placer' }),
                  w('roast beef', 'And the roast beef special.', { translation: 'carne asada' })] },
    54: { grammar: [
      { title: 'Some and any with indefinite amounts', commonErrors: [{ wrong: 'We have apples.', correct: 'We have some apples.' },
        { wrong: 'Do you have some eggs?', correct: 'Do you have any eggs?' }] },
      { title: 'Any in negative statements', commonErrors: [{ wrong: "We don't have eggs.", correct: "We don't have any eggs." },
        { wrong: "We don't want some cheese.", correct: "We don't want any cheese." }] }],
      exercises: [{ type: 'error_correction', question: 'Find and correct the mistake: We need milk and some bananas.', answer: 'We need some milk and some bananas.' }],
      speakingPrompts: ['Discuss ways to prepare food using the adjectives learned'] },
    56: { vocab: [w('sausages', 'I eat sausages for breakfast.'), w('shrimp', 'I eat shrimp for lunch.')] },
    57: { vocab: [w('healthy low-fat foods', 'The women eat healthy low-fat foods for dinner.')],
          exercises: [{ type: 'error_correction', question: 'Find and correct the mistake: Hot peppers contains a lot of salt.', answer: 'Hot peppers contain a lot of salt.' }] },
    58: { vocab: [w('truck', 'Traditional markets often have trucks.')] },
    59: { vocab: [w('green', 'Cuban fried green bananas are delicious.'), w('cheese bread', 'Colombian baked cheese bread is popular.')] },
  };
  return { a2_5: {
    fcProgress: { 'Peruvian grilled fish': { interval: 58 }, 'grilled fish': { interval: 75 }, 'Brazilian cheese bread': { interval: 52 },
                  'cheese bread': { interval: 20 }, green: { interval: 20 }, 'real treat': { interval: 1 } },
    batches: PAGINAS.map(n => ({ id: f.u5Lote(n), vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...(lotes[n] || {}) })),
  } };
}

function corregida() {
  const units = unidad();
  assert.equal(f.fixU5Pages(units), true);
  for (const n of PAGINAS) assert.equal(f[`fixU5P${n}`](units), true, `p. ${n}`);
  return units;
}

test('los platos raros se quedan con la comida, sin el país, y conservan el progreso', () => {
  const units = corregida();
  for (const raro of ['Peruvian grilled fish', 'Brazilian cheese bread', 'French Canadian yellow split pea soup']) {
    assert.equal(todas(units).some(v => v.word === raro), false, raro);
  }
  assert.ok(palabra(units, 50, 'pea soup'));
  assert.ok(palabra(units, 50, 'Russian salad'), 'la ensalada rusa se queda');
  assert.deepEqual(units.a2_5.fcProgress['grilled fish'], { interval: 75 }, 'queda el de intervalo más largo');
  assert.deepEqual(units.a2_5.fcProgress['cheese bread'], { interval: 52 });
  assert.equal(palabra(units, 59, 'fried green bananas').translation, 'patacones');
  assert.deepEqual(units.a2_5.fcProgress['fried green bananas'], { interval: 20 });
  assert.deepEqual(pagina(units, 50).grammar, []);
  const claves = todas(units).map(v => f.vocabKey(v.word));
  assert.equal(new Set(claves).size, claves.length);
});

test('p. 51: "a meat and potatoes man", no "a real treat"; roast beef es rosbif', () => {
  const units = corregida();
  assert.equal(palabra(units, 51, 'real treat'), undefined);
  assert.equal(palabra(units, 51, 'a meat and potatoes man').example, "I'm a real meat and potatoes man.");
  assert.deepEqual(units.a2_5.fcProgress['a meat and potatoes man'], { interval: 1 });
  assert.match(palabra(units, 51, 'roast beef').translation, /^rosbif/);
});

test('p. 54: some / any ya no da por error lo que está bien', () => {
  const units = corregida();
  const errores = t => pagina(units, 54).grammar.find(g => g.title === t).commonErrors.map(e => e.wrong);
  assert.deepEqual(errores('Some and any with indefinite amounts'), []);
  assert.deepEqual(errores('Any in negative statements'), ["We don't want some cheese."]);
  assert.deepEqual(pagina(units, 54).exercises, []);
  assert.deepEqual(pagina(units, 54).speakingPrompts, [], 'la página no trae tareas de hablar');
});

test('nada falso ni inventado sobre él', () => {
  const units = corregida();
  for (const v of todas(units)) assert.doesNotMatch(v.example, /I eat (sausages|shrimp)|markets often have trucks|The women eat/, v.word);
  assert.match(palabra(units, 57, 'healthy low-fat foods').example, /\(sausages with fried potatoes \/ healthy low-fat foods \/ fatty meats and seafood\)/);
  assert.deepEqual(pagina(units, 57).exercises, [], '"Hot peppers contain a lot of salt" es falso');
});

test('números de página; sin la página, nada; correrlo otra vez no cambia nada', () => {
  const units = corregida();
  assert.deepEqual(units.a2_5.batches.map(b => b.pages[0]), PAGINAS);
  for (const n of PAGINAS) f[`addU5P${n}Questions`](units);
  const una = JSON.stringify(units);
  f.fixU5Pages(units);
  for (const n of PAGINAS) { f[`fixU5P${n}`](units); f[`addU5P${n}Questions`](units); }
  assert.equal(JSON.stringify(units), una);
  for (const n of PAGINAS) assert.equal(f[`fixU5P${n}`]({ a2_5: { batches: [] } }), false);
});

test('cada página recibe sus preguntas', () => {
  const units = corregida();
  for (const n of PAGINAS) assert.equal(f[`addU5P${n}Questions`](units), true);
  for (const n of PAGINAS) {
    const q = pagina(units, n).vocab.filter(v => v.type === 'question');
    assert.ok(q.length >= 3, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  assert.equal(palabra(units, 51, 'Anything for dessert?').example, "No, thanks. We'll take the check, please.");
});

test('el arranque y la restauración las corren', () => {
  const migrar = h.extraerFuncion('migrateState');
  const aplicar = h.extraerFuncion('applyPageFixes');
  assert.match(migrar, /if \(!merged\._u5PagesV1 && fixU5Pages\(merged\.units\)\) merged\._u5PagesV1 = true;/);
  for (const n of PAGINAS) {
    assert.match(migrar, new RegExp(`\\['_u5P${n}V1', fixU5P${n}\\]`));
    assert.match(migrar, new RegExp(`\\['_u5P${n}QV1', addU5P${n}Questions\\]`));
    assert.match(aplicar, new RegExp(`\\bfixU5P${n}\\b`));
    assert.match(aplicar, new RegExp(`\\baddU5P${n}Questions\\b`));
  }
});
